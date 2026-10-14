using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Text.RegularExpressions;
using System.Net.NetworkInformation;

namespace LanShare
{
    public class ServerConfig
    {
        public int Port { get; set; }
        public string WebDir { get; set; }
        public string StorageDir { get; set; }
        public List<string> LocalIps { get; set; }

        public ServerConfig()
        {
            Port = 5200;
            LocalIps = new List<string>();
        }
    }

    public class FileUploadSession
    {
        public string FileId { get; set; }
        public string FileName { get; set; }
        public long FileSize { get; set; }
        public int TotalChunks { get; set; }
        public HashSet<int> ReceivedChunks { get; set; }
        public object LockObj { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime LastChunkTime { get; set; }
        public long BytesSinceLastCalc { get; set; }
        public double CurrentSpeed { get; set; }

        public FileUploadSession()
        {
            ReceivedChunks = new HashSet<int>();
            LockObj = new object();
            StartTime = DateTime.Now;
            LastChunkTime = DateTime.Now;
        }
    }

    public class PeerTransferInfo
    {
        public string TransferId { get; set; }
        public string Direction { get; set; } // "download" | "upload"
        public string FileName { get; set; }
        public string ClientIp { get; set; }
        public string DeviceName { get; set; }
        public long TotalBytes { get; set; }
        public long TransferredBytes { get; set; }
        public double SpeedBytesPerSec { get; set; }
        public string Status { get; set; } // "active" | "completed" | "interrupted"
        public DateTime StartTime { get; set; }
        public DateTime UpdatedTime { get; set; }
    }

    public class LanHttpServer
    {
        private TcpListener _listener;
        private ServerConfig _config;
        private bool _isRunning;
        private JavaScriptSerializer _json;
        private Dictionary<string, FileUploadSession> _uploadSessions;
        private Dictionary<string, PeerTransferInfo> _peerTransfers;
        private object _sessionLock;
        private object _transferLock;
        private string _clipboardText;
        private DateTime _clipboardUpdated;
        private Dictionary<string, object> _latestSpeedTest;
        private byte[] _speedTestDummyBuffer;

        public LanHttpServer(ServerConfig config)
        {
            _config = config;
            _json = new JavaScriptSerializer();
            _json.MaxJsonLength = int.MaxValue;
            _uploadSessions = new Dictionary<string, FileUploadSession>();
            _peerTransfers = new Dictionary<string, PeerTransferInfo>();
            _sessionLock = new object();
            _transferLock = new object();
            _clipboardText = "";
            _clipboardUpdated = DateTime.Now;
            _latestSpeedTest = null;

            // 初始化 128KB 高速内存测速块（非全零数据，防止网卡或浏览器压缩作弊）
            _speedTestDummyBuffer = new byte[131072];
            for (int i = 0; i < _speedTestDummyBuffer.Length; i++)
            {
                _speedTestDummyBuffer[i] = (byte)((i * 31 + 17) & 0xFF);
            }

            if (!Directory.Exists(_config.StorageDir))
            {
                Directory.CreateDirectory(_config.StorageDir);
            }
            string tempDir = Path.Combine(_config.StorageDir, ".temp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }
        }

        public void Start()
        {
            _listener = new TcpListener(IPAddress.Any, _config.Port);
            _listener.Start();
            _isRunning = true;
            ThreadPool.QueueUserWorkItem(ListenLoop);
        }

        public void Stop()
        {
            _isRunning = false;
            try
            {
                _listener.Stop();
            }
            catch { }
        }

        private void ListenLoop(object state)
        {
            while (_isRunning)
            {
                try
                {
                    TcpClient client = _listener.AcceptTcpClient();
                    ThreadPool.QueueUserWorkItem(c => ProcessClient((TcpClient)c), client);
                }
                catch
                {
                    if (!_isRunning) break;
                }
            }
        }

        private void ProcessClient(TcpClient client)
        {
            string clientIp = "127.0.0.1";
            try
            {
                var ep = client.Client.RemoteEndPoint as IPEndPoint;
                if (ep != null) clientIp = ep.Address.ToString();
            }
            catch { }

            using (client)
            using (NetworkStream stream = client.GetStream())
            {
                stream.ReadTimeout = 120000;
                stream.WriteTimeout = 120000;

                try
                {
                    byte[] buffer = new byte[8192];
                    int totalHeaderBytes = 0;
                    int headerEndIndex = -1;

                    while (totalHeaderBytes < buffer.Length)
                    {
                        int read = stream.Read(buffer, totalHeaderBytes, buffer.Length - totalHeaderBytes);
                        if (read <= 0) return;
                        totalHeaderBytes += read;

                        headerEndIndex = FindHeaderEnd(buffer, totalHeaderBytes);
                        if (headerEndIndex != -1) break;
                    }

                    if (headerEndIndex == -1) return;

                    string headerString = Encoding.UTF8.GetString(buffer, 0, headerEndIndex);
                    string[] lines = headerString.Split(new[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0) return;

                    string[] reqLineParts = lines[0].Split(' ');
                    if (reqLineParts.Length < 2) return;

                    string method = reqLineParts[0].ToUpperInvariant();
                    string fullUrl = reqLineParts[1];

                    var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    for (int i = 1; i < lines.Length; i++)
                    {
                        string line = lines[i];
                        int colonIdx = line.IndexOf(':');
                        if (colonIdx > 0)
                        {
                            string key = line.Substring(0, colonIdx).Trim();
                            string val = line.Substring(colonIdx + 1).Trim();
                            headers[key] = val;
                        }
                    }

                    int bodyStartIndex = headerEndIndex + 4;
                    int initialBodyCount = totalHeaderBytes - bodyStartIndex;
                    byte[] initialBody = new byte[initialBodyCount];
                    if (initialBodyCount > 0)
                    {
                        Array.Copy(buffer, bodyStartIndex, initialBody, 0, initialBodyCount);
                    }

                    long contentLength = 0;
                    if (headers.ContainsKey("Content-Length"))
                    {
                        long.TryParse(headers["Content-Length"], out contentLength);
                    }

                    string path = fullUrl;
                    var query = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    int qIdx = fullUrl.IndexOf('?');
                    if (qIdx >= 0)
                    {
                        path = fullUrl.Substring(0, qIdx);
                        string qStr = fullUrl.Substring(qIdx + 1);
                        foreach (var pair in qStr.Split('&'))
                        {
                            string[] kv = pair.Split('=');
                            if (kv.Length == 2)
                                query[Uri.UnescapeDataString(kv[0])] = Uri.UnescapeDataString(kv[1]);
                            else if (kv.Length == 1)
                                query[Uri.UnescapeDataString(kv[0])] = "";
                        }
                    }

                    if (method == "OPTIONS")
                    {
                        SendCorsOptionsResponse(stream);
                        return;
                    }

                    string deviceName = ParseDeviceName(headers, clientIp);

                    // 路由分发
                    if (path == "/api/info")
                    {
                        HandleApiInfo(stream, clientIp, deviceName);
                    }
                    else if (path == "/api/transfers")
                    {
                        HandleApiTransfers(stream);
                    }
                    else if (path == "/api/speedtest/ping")
                    {
                        HandleSpeedTestPing(stream, clientIp, deviceName);
                    }
                    else if (path == "/api/speedtest/down")
                    {
                        HandleSpeedTestDown(stream, query);
                    }
                    else if (path == "/api/speedtest/up" && method == "POST")
                    {
                        HandleSpeedTestUp(stream, initialBody, contentLength);
                    }
                    else if (path == "/api/speedtest/report" && method == "POST")
                    {
                        string body = ReadFullBodyString(stream, initialBody, contentLength);
                        HandleSpeedTestReport(stream, body, clientIp, deviceName);
                    }
                    else if (path == "/api/config")
                    {
                        if (method == "POST")
                        {
                            string body = ReadFullBodyString(stream, initialBody, contentLength);
                            HandleSetConfigDir(stream, body);
                        }
                        else
                        {
                            HandleGetConfig(stream);
                        }
                    }
                    else if (path == "/api/files")
                    {
                        HandleApiFiles(stream);
                    }
                    else if (path == "/api/files/delete" && method == "POST")
                    {
                        string body = ReadFullBodyString(stream, initialBody, contentLength);
                        HandleApiDeleteFile(stream, body);
                    }
                    else if (path == "/api/upload/init" && method == "POST")
                    {
                        string body = ReadFullBodyString(stream, initialBody, contentLength);
                        HandleUploadInit(stream, body, clientIp, deviceName);
                    }
                    else if (path == "/api/upload/chunk" && method == "POST")
                    {
                        HandleUploadChunk(stream, query, initialBody, contentLength, clientIp, deviceName);
                    }
                    else if (path == "/api/upload/finish" && method == "POST")
                    {
                        string body = ReadFullBodyString(stream, initialBody, contentLength);
                        HandleUploadFinish(stream, body, clientIp, deviceName);
                    }
                    else if (path == "/api/clipboard")
                    {
                        if (method == "POST")
                        {
                            string body = ReadFullBodyString(stream, initialBody, contentLength);
                            HandleSetClipboard(stream, body);
                        }
                        else
                        {
                            HandleGetClipboard(stream);
                        }
                    }
                    else if (path.StartsWith("/download/"))
                    {
                        string fileName = path.Substring("/download/".Length);
                        HandleDownload(stream, method, fileName, headers, clientIp, deviceName);
                    }
                    else
                    {
                        ServeStaticFile(stream, method, path);
                    }
                }
                catch
                {
                    // 客户端主动断开或传输结束
                }
            }
        }

        private string ParseDeviceName(Dictionary<string, string> headers, string clientIp)
        {
            string ua = headers.ContainsKey("User-Agent") ? headers["User-Agent"] : "";
            string dev = "终端设备";
            if (ua.Contains("iPhone")) dev = "iPhone";
            else if (ua.Contains("iPad")) dev = "iPad";
            else if (ua.Contains("Macintosh") || ua.Contains("Mac OS"))
            {
                dev = "Mac";
            }
            else if (ua.Contains("Android"))
            {
                var m = Regex.Match(ua, @"Android\s+[\d\.]+;\s*([^;\)]+)");
                if (m.Success && m.Groups[1].Value.Trim().Length > 0 && m.Groups[1].Value.Trim().Length < 24)
                    dev = "Android (" + m.Groups[1].Value.Trim() + ")";
                else
                    dev = "Android 手机";
            }
            else if (ua.Contains("Windows")) dev = "Windows 电脑";
            else if (ua.Contains("Linux")) dev = "Linux 设备";

            if (clientIp == "127.0.0.1" || clientIp == "::1")
            {
                return dev + " · 本机";
            }
            return string.Format("{0} ({1})", dev, clientIp);
        }

        private int FindHeaderEnd(byte[] buf, int len)
        {
            for (int i = 0; i <= len - 4; i++)
            {
                if (buf[i] == 13 && buf[i + 1] == 10 && buf[i + 2] == 13 && buf[i + 3] == 10)
                {
                    return i;
                }
            }
            return -1;
        }

        private string ReadFullBodyString(NetworkStream stream, byte[] initialBody, long totalLength)
        {
            using (var ms = new MemoryStream())
            {
                if (initialBody != null && initialBody.Length > 0)
                {
                    ms.Write(initialBody, 0, initialBody.Length);
                }
                long remaining = totalLength - (initialBody != null ? initialBody.Length : 0);
                byte[] buf = new byte[8192];
                while (remaining > 0)
                {
                    int toRead = (int)Math.Min(buf.Length, remaining);
                    int r = stream.Read(buf, 0, toRead);
                    if (r <= 0) break;
                    ms.Write(buf, 0, r);
                    remaining -= r;
                }
                return Encoding.UTF8.GetString(ms.ToArray());
            }
        }

        private void SendCorsOptionsResponse(NetworkStream stream)
        {
            string resp = "HTTP/1.1 204 No Content\r\n" +
                          "Access-Control-Allow-Origin: *\r\n" +
                          "Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD\r\n" +
                          "Access-Control-Allow-Headers: *\r\n" +
                          "Connection: close\r\n\r\n";
            byte[] bytes = Encoding.UTF8.GetBytes(resp);
            stream.Write(bytes, 0, bytes.Length);
        }

        private void HandleApiInfo(NetworkStream stream, string clientIp, string deviceName)
        {
            var data = new Dictionary<string, object>();
            data["port"] = _config.Port;
            data["uploadDir"] = _config.StorageDir;
            data["ips"] = _config.LocalIps;
            data["clientIp"] = clientIp;
            data["deviceName"] = deviceName;
            data["isLocalHost"] = (clientIp == "127.0.0.1" || clientIp == "::1" || _config.LocalIps.Contains(clientIp));
            SendJson(stream, 200, data);
        }

        private void HandleApiTransfers(NetworkStream stream)
        {
            var activeList = new List<Dictionary<string, object>>();
            DateTime now = DateTime.Now;

            lock (_transferLock)
            {
                var keysToRemove = new List<string>();
                foreach (var kv in _peerTransfers)
                {
                    var item = kv.Value;
                    double ageSec = (now - item.UpdatedTime).TotalSeconds;

                    // 如果处于 active 但超过 8 秒没有任何数据更新，说明已暂停或断开
                    if (item.Status == "active" && ageSec > 8)
                    {
                        if (item.TransferredBytes >= item.TotalBytes && item.TotalBytes > 0)
                            item.Status = "completed";
                        else
                            item.Status = "interrupted";
                    }

                    // 完成后保留 45 秒供界面展示，超时后自动清理
                    if ((item.Status == "completed" || item.Status == "interrupted") && ageSec > 45)
                    {
                        keysToRemove.Add(kv.Key);
                        continue;
                    }

                    var dict = new Dictionary<string, object>();
                    dict["id"] = item.TransferId;
                    dict["direction"] = item.Direction;
                    dict["fileName"] = item.FileName;
                    dict["clientIp"] = item.ClientIp;
                    dict["deviceName"] = item.DeviceName;
                    dict["totalBytes"] = item.TotalBytes;
                    dict["transferredBytes"] = item.TransferredBytes;
                    dict["speed"] = Math.Round(item.SpeedBytesPerSec, 0);
                    dict["status"] = item.Status;
                    dict["updatedAt"] = item.UpdatedTime.ToString("HH:mm:ss");
                    activeList.Add(dict);
                }

                foreach (var k in keysToRemove)
                {
                    _peerTransfers.Remove(k);
                }
            }

            var result = new Dictionary<string, object>();
            result["transfers"] = activeList;
            result["latestSpeedTest"] = _latestSpeedTest;
            SendJson(stream, 200, result);
        }

        private void HandleSpeedTestPing(NetworkStream stream, string clientIp, string deviceName)
        {
            var data = new Dictionary<string, object>();
            data["status"] = "pong";
            data["clientIp"] = clientIp;
            data["deviceName"] = deviceName;
            data["ts"] = DateTime.UtcNow.Ticks;
            SendJson(stream, 200, data);
        }

        private void HandleSpeedTestDown(NetworkStream stream, Dictionary<string, string> query)
        {
            long size = 16 * 1024 * 1024; // 默认 16MB 测速包
            if (query.ContainsKey("size"))
            {
                long.TryParse(query["size"], out size);
            }
            if (size < 1024 * 1024) size = 1024 * 1024;
            if (size > 64 * 1024 * 1024) size = 64 * 1024 * 1024;

            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 200 OK\r\n");
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Content-Type: application/octet-stream\r\n");
            sb.Append("Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n");
            sb.Append("Content-Length: " + size + "\r\n");
            sb.Append("Connection: close\r\n\r\n");

            byte[] hdr = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(hdr, 0, hdr.Length);

            long sent = 0;
            while (sent < size)
            {
                int toSend = (int)Math.Min(_speedTestDummyBuffer.Length, size - sent);
                stream.Write(_speedTestDummyBuffer, 0, toSend);
                sent += toSend;
            }
        }

        private void HandleSpeedTestUp(NetworkStream stream, byte[] initialBody, long contentLength)
        {
            long remaining = contentLength - (initialBody != null ? initialBody.Length : 0);
            byte[] discardBuf = new byte[65536];
            while (remaining > 0)
            {
                int toRead = (int)Math.Min(discardBuf.Length, remaining);
                int r = stream.Read(discardBuf, 0, toRead);
                if (r <= 0) break;
                remaining -= r;
            }

            var data = new Dictionary<string, object>();
            data["status"] = "ok";
            data["received"] = contentLength;
            SendJson(stream, 200, data);
        }

        private void HandleSpeedTestReport(NetworkStream stream, string body, string clientIp, string deviceName)
        {
            try
            {
                var map = _json.Deserialize<Dictionary<string, object>>(body);
                var report = new Dictionary<string, object>();
                report["clientIp"] = clientIp;
                report["deviceName"] = map.ContainsKey("deviceName") && map["deviceName"] != null ? map["deviceName"].ToString() : deviceName;
                report["pingMs"] = map.ContainsKey("pingMs") ? map["pingMs"] : 1;
                report["downMBps"] = map.ContainsKey("downMBps") ? map["downMBps"] : 0;
                report["upMBps"] = map.ContainsKey("upMBps") ? map["upMBps"] : 0;
                report["timestamp"] = DateTime.Now.ToString("HH:mm:ss");
                _latestSpeedTest = report;
            }
            catch { }

            var resp = new Dictionary<string, object>();
            resp["status"] = "ok";
            SendJson(stream, 200, resp);
        }

        private void HandleGetConfig(NetworkStream stream)
        {
            var data = new Dictionary<string, object>();
            data["storageDir"] = _config.StorageDir;

            try
            {
                string root = Path.GetPathRoot(_config.StorageDir);
                var drive = new DriveInfo(root);
                data["freeSpace"] = FormatBytes(drive.AvailableFreeSpace);
                data["totalSpace"] = FormatBytes(drive.TotalSize);
                data["freeBytes"] = drive.AvailableFreeSpace;
                data["totalBytes"] = drive.TotalSize;
            }
            catch
            {
                data["freeSpace"] = "--";
                data["totalSpace"] = "--";
            }

            var drivesList = new List<Dictionary<string, string>>();
            try
            {
                foreach (var d in DriveInfo.GetDrives())
                {
                    if (d.IsReady)
                    {
                        var dItem = new Dictionary<string, string>();
                        dItem["name"] = d.Name;
                        dItem["label"] = string.Format("{0} ({1}可用)", d.Name, FormatBytes(d.AvailableFreeSpace));
                        dItem["path"] = Path.Combine(d.Name, "LAN_Share");
                        drivesList.Add(dItem);
                    }
                }
            }
            catch { }
            data["drives"] = drivesList;

            SendJson(stream, 200, data);
        }

        private void HandleSetConfigDir(NetworkStream stream, string body)
        {
            var map = _json.Deserialize<Dictionary<string, object>>(body);
            string newDir = map.ContainsKey("storageDir") ? map["storageDir"].ToString().Trim() : "";

            if (string.IsNullOrEmpty(newDir))
            {
                var err = new Dictionary<string, object>();
                err["error"] = "路径不能为空";
                SendJson(stream, 400, err);
                return;
            }

            try
            {
                if (!Directory.Exists(newDir))
                {
                    Directory.CreateDirectory(newDir);
                }
                string tempDir = Path.Combine(newDir, ".temp");
                if (!Directory.Exists(tempDir))
                {
                    Directory.CreateDirectory(tempDir);
                }

                _config.StorageDir = newDir;
                SaveConfigToFile(newDir);

                var ret = new Dictionary<string, object>();
                ret["status"] = "ok";
                ret["storageDir"] = newDir;
                SendJson(stream, 200, ret);
            }
            catch (Exception ex)
            {
                var err = new Dictionary<string, object>();
                err["error"] = ex.Message;
                SendJson(stream, 400, err);
            }
        }

        private void SaveConfigToFile(string dir)
        {
            try
            {
                string confPath = Path.Combine(_config.WebDir, "..", "config.json");
                confPath = Path.GetFullPath(confPath);
                var confData = new Dictionary<string, object>();
                confData["storageDir"] = dir;
                File.WriteAllText(confPath, _json.Serialize(confData), Encoding.UTF8);
            }
            catch { }
        }

        private string FormatBytes(long bytes)
        {
            string[] units = { "B", "KB", "MB", "GB", "TB" };
            double val = bytes;
            int idx = 0;
            while (val >= 1024 && idx < units.Length - 1)
            {
                val /= 1024;
                idx++;
            }
            return string.Format("{0:0.##} {1}", val, units[idx]);
        }

        private void HandleApiFiles(NetworkStream stream)
        {
            var list = new List<Dictionary<string, object>>();
            if (Directory.Exists(_config.StorageDir))
            {
                var dirInfo = new DirectoryInfo(_config.StorageDir);
                FileInfo[] files = dirInfo.GetFiles();
                Array.Sort(files, (a, b) => b.LastWriteTime.CompareTo(a.LastWriteTime));

                foreach (var f in files)
                {
                    if (f.Name.StartsWith(".") || f.Name.EndsWith(".part")) continue;
                    var item = new Dictionary<string, object>();
                    item["name"] = f.Name;
                    item["size"] = f.Length;
                    item["modified"] = f.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss");
                    list.Add(item);
                }
            }
            SendJson(stream, 200, list);
        }

        private void HandleApiDeleteFile(NetworkStream stream, string body)
        {
            var map = _json.Deserialize<Dictionary<string, object>>(body);
            string fileName = map.ContainsKey("name") ? map["name"].ToString() : "";
            fileName = Path.GetFileName(fileName);

            string targetPath = Path.Combine(_config.StorageDir, fileName);
            if (File.Exists(targetPath))
            {
                File.Delete(targetPath);
                var ret = new Dictionary<string, object>();
                ret["status"] = "ok";
                SendJson(stream, 200, ret);
            }
            else
            {
                var ret = new Dictionary<string, object>();
                ret["error"] = "file not found";
                SendJson(stream, 404, ret);
            }
        }

        private void HandleUploadInit(NetworkStream stream, string body, string clientIp, string deviceName)
        {
            var map = _json.Deserialize<Dictionary<string, object>>(body);

            string fileId = SanitizeId(map["fileId"].ToString());
            string fileName = Path.GetFileName(map["fileName"].ToString());
            long fileSize = Convert.ToInt64(map["fileSize"]);
            int totalChunks = Convert.ToInt32(map["totalChunks"]);

            FileUploadSession session;
            lock (_sessionLock)
            {
                if (!_uploadSessions.TryGetValue(fileId, out session))
                {
                    session = new FileUploadSession();
                    session.FileId = fileId;
                    session.FileName = fileName;
                    session.FileSize = fileSize;
                    session.TotalChunks = totalChunks;
                    _uploadSessions[fileId] = session;
                }
            }

            var receivedList = new List<int>();
            string tempDir = Path.Combine(_config.StorageDir, ".temp");
            string partPath = Path.Combine(tempDir, fileId + ".part");

            lock (session.LockObj)
            {
                receivedList.AddRange(session.ReceivedChunks);
                try
                {
                    if (!File.Exists(partPath))
                    {
                        using (var fs = new FileStream(partPath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
                        {
                            if (fileSize > 0)
                            {
                                fs.SetLength(fileSize);
                            }
                        }
                    }
                }
                catch { }
            }

            // 登记上传传输监控记录
            string transferKey = "up_" + fileId;
            lock (_transferLock)
            {
                PeerTransferInfo tInfo;
                if (!_peerTransfers.TryGetValue(transferKey, out tInfo))
                {
                    tInfo = new PeerTransferInfo
                    {
                        TransferId = transferKey,
                        Direction = "upload",
                        FileName = fileName,
                        ClientIp = clientIp,
                        DeviceName = deviceName,
                        TotalBytes = fileSize,
                        TransferredBytes = 0,
                        SpeedBytesPerSec = 0,
                        Status = "active",
                        StartTime = DateTime.Now,
                        UpdatedTime = DateTime.Now
                    };
                    _peerTransfers[transferKey] = tInfo;
                }
                else
                {
                    tInfo.Status = "active";
                    tInfo.UpdatedTime = DateTime.Now;
                }
            }

            var respData = new Dictionary<string, object>();
            respData["fileId"] = fileId;
            respData["receivedChunks"] = receivedList;
            respData["isComplete"] = receivedList.Count >= totalChunks;
            SendJson(stream, 200, respData);
        }

        private void HandleUploadChunk(NetworkStream stream, Dictionary<string, string> query, byte[] initialBody, long totalLength, string clientIp, string deviceName)
        {
            string fileId = SanitizeId(query.ContainsKey("fileId") ? query["fileId"] : "");
            int chunkIndex = query.ContainsKey("chunkIndex") ? int.Parse(query["chunkIndex"]) : 0;
            long offset = query.ContainsKey("offset") ? long.Parse(query["offset"]) : 0;

            FileUploadSession session;
            lock (_sessionLock)
            {
                if (!_uploadSessions.TryGetValue(fileId, out session))
                {
                    session = new FileUploadSession();
                    session.FileId = fileId;
                    _uploadSessions[fileId] = session;
                }
            }

            string tempDir = Path.Combine(_config.StorageDir, ".temp");
            string partPath = Path.Combine(tempDir, fileId + ".part");

            DateTime chunkStart = DateTime.Now;

            lock (session.LockObj)
            {
                using (var fs = new FileStream(partPath, FileMode.OpenOrCreate, FileAccess.Write, FileShare.ReadWrite))
                {
                    fs.Seek(offset, SeekOrigin.Begin);
                    if (initialBody != null && initialBody.Length > 0)
                    {
                        fs.Write(initialBody, 0, initialBody.Length);
                    }

                    long remaining = totalLength - (initialBody != null ? initialBody.Length : 0);
                    byte[] buf = new byte[64 * 1024];
                    while (remaining > 0)
                    {
                        int toRead = (int)Math.Min(buf.Length, remaining);
                        int r = stream.Read(buf, 0, toRead);
                        if (r <= 0) break;
                        fs.Write(buf, 0, r);
                        remaining -= r;
                    }
                }

                session.ReceivedChunks.Add(chunkIndex);
                double sec = Math.Max(0.05, (DateTime.Now - chunkStart).TotalSeconds);
                double chunkSpeed = totalLength / sec;
                session.CurrentSpeed = session.CurrentSpeed <= 0 ? chunkSpeed : (session.CurrentSpeed * 0.4 + chunkSpeed * 0.6);
            }

            string transferKey = "up_" + fileId;
            lock (_transferLock)
            {
                PeerTransferInfo tInfo;
                if (_peerTransfers.TryGetValue(transferKey, out tInfo))
                {
                    long approxBytes = Math.Min(tInfo.TotalBytes, offset + totalLength);
                    if (approxBytes > tInfo.TransferredBytes)
                        tInfo.TransferredBytes = approxBytes;
                    tInfo.SpeedBytesPerSec = session.CurrentSpeed;
                    tInfo.Status = "active";
                    tInfo.UpdatedTime = DateTime.Now;
                }
            }

            var resp = new Dictionary<string, object>();
            resp["status"] = "ok";
            resp["chunkIndex"] = chunkIndex;
            SendJson(stream, 200, resp);
        }

        private void HandleUploadFinish(NetworkStream stream, string body, string clientIp, string deviceName)
        {
            var map = _json.Deserialize<Dictionary<string, object>>(body);
            string fileId = SanitizeId(map["fileId"].ToString());
            string fileName = Path.GetFileName(map["fileName"].ToString());

            string tempDir = Path.Combine(_config.StorageDir, ".temp");
            string partPath = Path.Combine(tempDir, fileId + ".part");

            if (!File.Exists(partPath))
            {
                var err = new Dictionary<string, object>();
                err["error"] = "part file missing";
                SendJson(stream, 400, err);
                return;
            }

            string targetPath = Path.Combine(_config.StorageDir, fileName);
            if (File.Exists(targetPath))
            {
                string baseName = Path.GetFileNameWithoutExtension(fileName);
                string ext = Path.GetExtension(fileName);
                int count = 1;
                while (File.Exists(targetPath))
                {
                    targetPath = Path.Combine(_config.StorageDir, string.Format("{0} ({1}){2}", baseName, count, ext));
                    count++;
                }
            }

            File.Move(partPath, targetPath);

            lock (_sessionLock)
            {
                _uploadSessions.Remove(fileId);
            }

            string transferKey = "up_" + fileId;
            lock (_transferLock)
            {
                PeerTransferInfo tInfo;
                if (_peerTransfers.TryGetValue(transferKey, out tInfo))
                {
                    tInfo.TransferredBytes = tInfo.TotalBytes;
                    tInfo.Status = "completed";
                    tInfo.UpdatedTime = DateTime.Now;
                }
            }

            var ok = new Dictionary<string, object>();
            ok["status"] = "success";
            ok["name"] = Path.GetFileName(targetPath);
            SendJson(stream, 200, ok);
        }

        private void HandleDownload(NetworkStream stream, string method, string urlFileName, Dictionary<string, string> headers, string clientIp, string deviceName)
        {
            string fileName = Uri.UnescapeDataString(urlFileName);
            fileName = Path.GetFileName(fileName);
            string filePath = Path.Combine(_config.StorageDir, fileName);

            if (!File.Exists(filePath))
            {
                SendStatus(stream, 404, "Not Found");
                return;
            }

            var fi = new FileInfo(filePath);
            long totalLength = fi.Length;

            string rangeHeader = headers.ContainsKey("Range") ? headers["Range"] : null;
            long start = 0;
            long end = totalLength - 1;
            bool isPartial = false;

            if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes="))
            {
                var match = Regex.Match(rangeHeader, @"bytes=(\d*)-(\d*)");
                if (match.Success)
                {
                    isPartial = true;
                    string sVal = match.Groups[1].Value;
                    string eVal = match.Groups[2].Value;

                    if (!string.IsNullOrEmpty(sVal)) start = long.Parse(sVal);
                    if (!string.IsNullOrEmpty(eVal)) end = long.Parse(eVal);

                    if (end >= totalLength) end = totalLength - 1;
                }
            }

            long contentLength = end - start + 1;
            string encodedName = Uri.EscapeDataString(fileName);

            StringBuilder sb = new StringBuilder();
            if (isPartial)
            {
                sb.Append("HTTP/1.1 206 Partial Content\r\n");
                sb.Append(string.Format("Content-Range: bytes {0}-{1}/{2}\r\n", start, end, totalLength));
            }
            else
            {
                sb.Append("HTTP/1.1 200 OK\r\n");
            }
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Accept-Ranges: bytes\r\n");
            sb.Append("Content-Type: application/octet-stream\r\n");
            sb.Append(string.Format("Content-Disposition: attachment; filename=\"{0}\"; filename*=UTF-8''{1}\r\n", fileName, encodedName));
            sb.Append("Content-Length: " + contentLength + "\r\n");
            sb.Append("Connection: close\r\n\r\n");

            byte[] hdrBytes = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(hdrBytes, 0, hdrBytes.Length);

            if (method == "HEAD") return;

            // 忽略浏览器极小探测请求（例如 Range: bytes=0-1）对监控面板的干扰
            bool trackTransfer = (contentLength > 65536 || contentLength == totalLength);
            string transferKey = "down_" + clientIp + "_" + fileName;
            PeerTransferInfo tInfo = null;

            if (trackTransfer)
            {
                lock (_transferLock)
                {
                    if (!_peerTransfers.TryGetValue(transferKey, out tInfo))
                    {
                        tInfo = new PeerTransferInfo
                        {
                            TransferId = transferKey,
                            Direction = "download",
                            FileName = fileName,
                            ClientIp = clientIp,
                            DeviceName = deviceName,
                            TotalBytes = totalLength,
                            TransferredBytes = start,
                            SpeedBytesPerSec = 0,
                            Status = "active",
                            StartTime = DateTime.Now,
                            UpdatedTime = DateTime.Now
                        };
                        _peerTransfers[transferKey] = tInfo;
                    }
                    else
                    {
                        tInfo.Status = "active";
                        tInfo.DeviceName = deviceName;
                        tInfo.TotalBytes = totalLength;
                        if (start == 0) tInfo.StartTime = DateTime.Now;
                        tInfo.UpdatedTime = DateTime.Now;
                    }
                }
            }

            try
            {
                using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
                    if (start > 0) fs.Seek(start, SeekOrigin.Begin);

                    byte[] buffer = new byte[128 * 1024];
                    long totalSent = 0;
                    long bytesSinceLastCalc = 0;
                    Stopwatch sw = Stopwatch.StartNew();
                    long lastCalcMs = 0;

                    while (totalSent < contentLength)
                    {
                        int toRead = (int)Math.Min(buffer.Length, contentLength - totalSent);
                        int read = fs.Read(buffer, 0, toRead);
                        if (read <= 0) break;

                        stream.Write(buffer, 0, read);
                        totalSent += read;
                        bytesSinceLastCalc += read;

                        long nowMs = sw.ElapsedMilliseconds;
                        if (trackTransfer && tInfo != null && (nowMs - lastCalcMs >= 220))
                        {
                            double elapsedSec = (nowMs - lastCalcMs) / 1000.0;
                            double instSpeed = bytesSinceLastCalc / elapsedSec;
                            lock (_transferLock)
                            {
                                tInfo.TransferredBytes = start + totalSent;
                                tInfo.SpeedBytesPerSec = tInfo.SpeedBytesPerSec <= 0
                                    ? instSpeed
                                    : (tInfo.SpeedBytesPerSec * 0.35 + instSpeed * 0.65);
                                tInfo.Status = "active";
                                tInfo.UpdatedTime = DateTime.Now;
                            }
                            bytesSinceLastCalc = 0;
                            lastCalcMs = nowMs;
                        }
                    }

                    sw.Stop();
                    if (trackTransfer && tInfo != null)
                    {
                        double totalSec = Math.Max(0.02, sw.Elapsed.TotalSeconds);
                        double avgSpeed = totalSent / totalSec;
                        lock (_transferLock)
                        {
                            tInfo.TransferredBytes = start + totalSent;
                            if (tInfo.SpeedBytesPerSec <= 0)
                                tInfo.SpeedBytesPerSec = avgSpeed;
                            if (tInfo.TransferredBytes >= totalLength)
                                tInfo.Status = "completed";
                            tInfo.UpdatedTime = DateTime.Now;
                        }
                    }
                }
            }
            catch
            {
                if (trackTransfer && tInfo != null)
                {
                    lock (_transferLock)
                    {
                        if (tInfo.TransferredBytes >= totalLength && totalLength > 0)
                            tInfo.Status = "completed";
                        else
                            tInfo.Status = "interrupted";
                        tInfo.UpdatedTime = DateTime.Now;
                    }
                }
                throw;
            }
        }

        private void HandleSetClipboard(NetworkStream stream, string body)
        {
            var map = _json.Deserialize<Dictionary<string, object>>(body);
            if (map.ContainsKey("text"))
            {
                _clipboardText = map["text"].ToString();
                _clipboardUpdated = DateTime.Now;
            }
            var ret = new Dictionary<string, object>();
            ret["status"] = "ok";
            SendJson(stream, 200, ret);
        }

        private void HandleGetClipboard(NetworkStream stream)
        {
            var data = new Dictionary<string, object>();
            data["text"] = _clipboardText;
            data["updated"] = _clipboardUpdated.ToString("yyyy-MM-ddTHH:mm:ss");
            SendJson(stream, 200, data);
        }

        private void ServeStaticFile(NetworkStream stream, string method, string path)
        {
            if (path == "/" || string.IsNullOrEmpty(path))
            {
                path = "/index.html";
            }

            string relPath = path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string fullPath = Path.Combine(_config.WebDir, relPath);

            if (!File.Exists(fullPath))
            {
                SendStatus(stream, 404, "Not Found");
                return;
            }

            string ext = Path.GetExtension(fullPath).ToLower();
            string contentType = "application/octet-stream";
            if (ext == ".html") contentType = "text/html; charset=utf-8";
            else if (ext == ".css") contentType = "text/css; charset=utf-8";
            else if (ext == ".js") contentType = "application/javascript; charset=utf-8";
            else if (ext == ".svg") contentType = "image/svg+xml";
            else if (ext == ".png") contentType = "image/png";
            else if (ext == ".jpg" || ext == ".jpeg") contentType = "image/jpeg";
            else if (ext == ".ico") contentType = "image/x-icon";
            else if (ext == ".json") contentType = "application/json; charset=utf-8";

            byte[] fileBytes = File.ReadAllBytes(fullPath);

            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 200 OK\r\n");
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Cache-Control: no-cache\r\n");
            sb.Append("Content-Type: " + contentType + "\r\n");
            sb.Append("Content-Length: " + fileBytes.Length + "\r\n");
            sb.Append("Connection: close\r\n\r\n");

            byte[] hdr = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(hdr, 0, hdr.Length);

            if (method != "HEAD")
            {
                stream.Write(fileBytes, 0, fileBytes.Length);
            }
        }

        private void SendJson(NetworkStream stream, int statusCode, object data)
        {
            string jsonStr = _json.Serialize(data);
            byte[] bytes = Encoding.UTF8.GetBytes(jsonStr);

            StringBuilder sb = new StringBuilder();
            sb.Append("HTTP/1.1 " + statusCode + " OK\r\n");
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Cache-Control: no-store, no-cache\r\n");
            sb.Append("Content-Type: application/json; charset=utf-8\r\n");
            sb.Append("Content-Length: " + bytes.Length + "\r\n");
            sb.Append("Connection: close\r\n\r\n");

            byte[] hdr = Encoding.UTF8.GetBytes(sb.ToString());
            stream.Write(hdr, 0, hdr.Length);
            stream.Write(bytes, 0, bytes.Length);
        }

        private void SendStatus(NetworkStream stream, int code, string msg)
        {
            string resp = "HTTP/1.1 " + code + " " + msg + "\r\n" +
                          "Content-Length: 0\r\n" +
                          "Connection: close\r\n\r\n";
            byte[] bytes = Encoding.UTF8.GetBytes(resp);
            stream.Write(bytes, 0, bytes.Length);
        }

        private string SanitizeId(string id)
        {
            return Regex.Replace(id ?? "", @"[^a-zA-Z0-9_\-]", "");
        }
    }

    public class Program
    {
        public static void Main(string[] args)
        {
            try { Console.OutputEncoding = Encoding.UTF8; } catch { }
            try { Console.Title = "Şatafat Media — Apple Liquid Glass LAN Share"; } catch { }

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string webDir = Path.Combine(baseDir, "web");
            if (!Directory.Exists(webDir))
            {
                string currentWeb = Path.Combine(Directory.GetCurrentDirectory(), "web");
                if (Directory.Exists(currentWeb))
                {
                    baseDir = Directory.GetCurrentDirectory();
                    webDir = currentWeb;
                }
            }

            string defaultStorage = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "Downloads",
                "LAN_Share"
            );

            string configFile = Path.Combine(baseDir, "config.json");
            if (File.Exists(configFile))
            {
                try
                {
                    string jsonText = File.ReadAllText(configFile, Encoding.UTF8);
                    JavaScriptSerializer serializer = new JavaScriptSerializer();
                    var cfg = serializer.Deserialize<Dictionary<string, object>>(jsonText);
                    if (cfg != null && cfg.ContainsKey("storageDir") && cfg["storageDir"] != null)
                    {
                        string customDir = cfg["storageDir"].ToString().Trim();
                        if (!string.IsNullOrEmpty(customDir))
                        {
                            defaultStorage = customDir;
                        }
                    }
                }
                catch { }
            }

            try
            {
                if (!Directory.Exists(defaultStorage))
                {
                    Directory.CreateDirectory(defaultStorage);
                }
            }
            catch { }

            List<string> localIps = new List<string>();
            try
            {
                foreach (NetworkInterface nic in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (nic.OperationalStatus != OperationalStatus.Up ||
                        nic.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                        continue;

                    IPInterfaceProperties ipProps = nic.GetIPProperties();
                    foreach (UnicastIPAddressInformation addr in ipProps.UnicastAddresses)
                    {
                        if (addr.Address.AddressFamily == AddressFamily.InterNetwork)
                        {
                            string ipStr = addr.Address.ToString();
                            if (!ipStr.StartsWith("127.") && !ipStr.StartsWith("169.254.") && !localIps.Contains(ipStr))
                            {
                                localIps.Add(ipStr);
                            }
                        }
                    }
                }
            }
            catch { }

            if (localIps.Count == 0)
            {
                localIps.Add("127.0.0.1");
            }

            int port = 5200;
            while (port < 65535)
            {
                bool isAvailable = true;
                try
                {
                    TcpListener probe = new TcpListener(IPAddress.Loopback, port);
                    probe.Start();
                    probe.Stop();
                }
                catch
                {
                    isAvailable = false;
                    port++;
                }
                if (isAvailable) break;
            }

            ServerConfig config = new ServerConfig();
            config.Port = port;
            config.WebDir = webDir;
            config.StorageDir = defaultStorage;
            foreach (string ip in localIps)
            {
                config.LocalIps.Add(ip);
            }

            LanHttpServer server = new LanHttpServer(config);
            server.Start();

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("============================================================");
            Console.WriteLine("   Şatafat Media — Apple Liquid Glass 局域网极速快传已启动");
            Console.WriteLine("============================================================");
            Console.ResetColor();
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine(" [支持设备] Windows / Mac / iPhone (Safari) / Android / iPad");
            Console.WriteLine(" [核心特性] 液态玻璃光学界面 · 双端链路测速 · 接收速度实时监测 · 100GB+ 分片断点续传");
            Console.ForegroundColor = ConsoleColor.Gray;
            Console.WriteLine(" [存储目录] " + defaultStorage);
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("------------------------------------------------------------");
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine(" 其他设备（手机/平板/电脑）在同一 Wi-Fi 下浏览器输入此网址：");
            Console.ForegroundColor = ConsoleColor.White;
            foreach (string ip in localIps)
            {
                Console.WriteLine("   -> http://" + ip + ":" + port);
            }
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine("------------------------------------------------------------");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine(" 本机电脑访问: http://localhost:" + port);
            Console.ForegroundColor = ConsoleColor.DarkGray;
            Console.WriteLine(" 按 Ctrl+C 或直接关闭此窗口即可停止服务。");
            Console.WriteLine("============================================================");
            Console.ResetColor();

            bool noBrowser = false;
            if (args != null)
            {
                foreach (string a in args)
                {
                    if (a == "--no-browser" || a == "-n") noBrowser = true;
                }
            }

            if (!noBrowser)
            {
                try
                {
                    Process.Start("http://localhost:" + port);
                }
                catch { }
            }

            ManualResetEvent exitEvent = new ManualResetEvent(false);
            Console.CancelKeyPress += (sender, e) =>
            {
                e.Cancel = true;
                exitEvent.Set();
            };

            exitEvent.WaitOne();
            Console.WriteLine("\n正在安全停止服务 / Stopping server...");
            server.Stop();
        }
    }
}

