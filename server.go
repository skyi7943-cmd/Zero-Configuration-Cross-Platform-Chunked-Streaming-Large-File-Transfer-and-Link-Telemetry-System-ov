package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ServerConfig struct {
	Port       int
	WebDir     string
	StorageDir string
	LocalIPs   []string
}

type FileSession struct {
	FileID         string       `json:"fileId"`
	FileName       string       `json:"fileName"`
	FileSize       int64        `json:"fileSize"`
	TotalChunks    int          `json:"totalChunks"`
	ReceivedChunks map[int]bool `json:"receivedChunks"`
	Lock           sync.RWMutex `json:"-"`
}

type PeerTransfer struct {
	ID               string    `json:"id"`
	FileName         string    `json:"fileName"`
	ClientIP         string    `json:"clientIp"`
	DeviceName       string    `json:"deviceName"`
	Direction        string    `json:"direction"`
	TotalBytes       int64     `json:"totalBytes"`
	TransferredBytes int64     `json:"transferredBytes"`
	SpeedBps         int64     `json:"speedBps"`
	Status           string    `json:"status"`
	UpdatedAt        time.Time `json:"-"`
	LastTickTime     time.Time `json:"-"`
	LastTickBytes    int64     `json:"-"`
}

type SpeedTestRecord struct {
	ClientIP   string  `json:"clientIp"`
	DeviceName string  `json:"deviceName"`
	PingMs     int     `json:"pingMs"`
	DownMBps   float64 `json:"downMBps"`
	UpMBps     float64 `json:"upMBps"`
	Timestamp  string  `json:"timestamp"`
}

type ClipboardData struct {
	Text    string `json:"text"`
	Updated string `json:"updated"`
}

var (
	sessionsLock sync.RWMutex
	sessions     = make(map[string]*FileSession)

	transfersLock   sync.RWMutex
	peerTransfers   = make(map[string]*PeerTransfer)
	latestSpeedTest *SpeedTestRecord

	clipLock  sync.RWMutex
	clipboard = ClipboardData{Text: "", Updated: time.Now().Format(time.RFC3339)}

	speedTestBuf = make([]byte, 128*1024)
	config       ServerConfig
)

func main() {
	for i := range speedTestBuf {
		speedTestBuf[i] = byte((i*31 + 17) & 0xFF)
	}

	userHome, err := os.UserHomeDir()
	if err != nil {
		userHome = "."
	}

	storageDir := filepath.Join(userHome, "Downloads", "LAN_Share")
	os.MkdirAll(storageDir, 0755)
	os.MkdirAll(filepath.Join(storageDir, ".temp"), 0755)

	exePath, err := os.Executable()
	baseDir := "."
	if err == nil {
		baseDir = filepath.Dir(exePath)
	}
	webDir := filepath.Join(baseDir, "web")
	if _, err := os.Stat(webDir); os.IsNotExist(err) {
		webDir = "web"
	}

	cfgFile := filepath.Join(baseDir, "config.json")
	if data, err := os.ReadFile(cfgFile); err == nil {
		var cfgMap map[string]string
		if json.Unmarshal(data, &cfgMap) == nil {
			if dir, ok := cfgMap["storageDir"]; ok && strings.TrimSpace(dir) != "" {
				storageDir = strings.TrimSpace(dir)
			}
		}
	}

	ips := getLocalIPs()
	port := findAvailablePort(5200)

	config = ServerConfig{
		Port:       port,
		WebDir:     webDir,
		StorageDir: storageDir,
		LocalIPs:   ips,
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/info", handleAPIInfo)
	mux.HandleFunc("/api/config", handleAPIConfig)
	mux.HandleFunc("/api/files", handleAPIFiles)
	mux.HandleFunc("/api/files/delete", handleAPIDeleteFile)
	mux.HandleFunc("/api/transfers", handleAPITransfers)
	mux.HandleFunc("/api/speedtest/ping", handleSpeedTestPing)
	mux.HandleFunc("/api/speedtest/down", handleSpeedTestDown)
	mux.HandleFunc("/api/speedtest/up", handleSpeedTestUp)
	mux.HandleFunc("/api/speedtest/report", handleSpeedTestReport)
	mux.HandleFunc("/api/upload/init", handleUploadInit)
	mux.HandleFunc("/api/upload/chunk", handleUploadChunk)
	mux.HandleFunc("/api/upload/finish", handleUploadFinish)
	mux.HandleFunc("/api/clipboard", handleClipboard)
	mux.HandleFunc("/download/", handleDownload)

	fs := http.FileServer(http.Dir(config.WebDir))
	mux.Handle("/", fs)

	addr := fmt.Sprintf(":%d", port)
	localURL := fmt.Sprintf("http://localhost:%d", port)

	fmt.Println("============================================================")
	fmt.Println("   🚀 Şatafat Media - Apple Liquid Glass 局域网互传引擎")
	fmt.Println("============================================================")
	fmt.Printf(" [存储目录]   %s\n\n", config.StorageDir)
	fmt.Println(" 📱 手机扫码或浏览器访问：")
	for _, ip := range ips {
		fmt.Printf("   👉 http://%s:%d\n", ip, port)
	}
	fmt.Printf(" 💻 本机电脑访问: %s\n", localURL)
	fmt.Println("============================================================")

	go func() {
		time.Sleep(500 * time.Millisecond)
		openBrowser(localURL)
	}()

	log.Fatal(http.ListenAndServe(addr, enableCORS(mux)))
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Range")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func handleAPIInfo(w http.ResponseWriter, r *http.Request) {
	sendJSON(w, map[string]interface{}{
		"port":      config.Port,
		"uploadDir": config.StorageDir,
		"ips":       config.LocalIPs,
	})
}

func handleAPITransfers(w http.ResponseWriter, r *http.Request) {
	now := time.Now()
	transfersLock.Lock()
	var list []map[string]interface{}
	for k, pt := range peerTransfers {
		age := now.Sub(pt.UpdatedAt).Seconds()
		if pt.Status == "active" && age > 8 {
			pt.Status = "interrupted"
			pt.SpeedBps = 0
		}
		if age > 25 {
			delete(peerTransfers, k)
			continue
		}
		list = append(list, map[string]interface{}{
			"id":               pt.ID,
			"fileName":         pt.FileName,
			"clientIp":         pt.ClientIP,
			"deviceName":       pt.DeviceName,
			"direction":        pt.Direction,
			"totalBytes":       pt.TotalBytes,
			"transferredBytes": pt.TransferredBytes,
			"speedBps":         pt.SpeedBps,
			"status":           pt.Status,
			"secondsAgo":       int(age),
		})
	}
	st := latestSpeedTest
	transfersLock.Unlock()

	if list == nil {
		list = []map[string]interface{}{}
	}
	sendJSON(w, map[string]interface{}{
		"transfers":       list,
		"latestSpeedTest": st,
	})
}

func handleSpeedTestPing(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	sendJSON(w, map[string]interface{}{
		"pong":       true,
		"serverTime": time.Now().UnixMilli(),
	})
}

func handleSpeedTestDown(w http.ResponseWriter, r *http.Request) {
	sizeBytes, err := strconv.ParseInt(r.URL.Query().Get("size"), 10, 64)
	if err != nil || sizeBytes <= 0 {
		sizeBytes = 16 * 1024 * 1024
	}
	if sizeBytes > 128*1024*1024 {
		sizeBytes = 128 * 1024 * 1024
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Cache-Control", "no-store, no-transform")
	w.Header().Set("Content-Length", strconv.FormatInt(sizeBytes, 10))

	remaining := sizeBytes
	for remaining > 0 {
		toWrite := int64(len(speedTestBuf))
		if remaining < toWrite {
			toWrite = remaining
		}
		n, err := w.Write(speedTestBuf[:toWrite])
		if err != nil {
			break
		}
		remaining -= int64(n)
	}
}

func handleSpeedTestUp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	written, _ := io.Copy(io.Discard, r.Body)
	sendJSON(w, map[string]interface{}{
		"receivedBytes": written,
	})
}

func handleSpeedTestReport(w http.ResponseWriter, r *http.Request) {
	var body SpeedTestRecord
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		sendError(w, "invalid json", http.StatusBadRequest)
		return
	}
	body.ClientIP = getClientIP(r)
	if body.DeviceName == "" {
		body.DeviceName = parseDeviceName(r.UserAgent())
	}
	body.Timestamp = time.Now().Format("2006-01-02T15:04:05")

	transfersLock.Lock()
	latestSpeedTest = &body
	transfersLock.Unlock()

	sendJSON(w, body)
}

func handleAPIConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req struct {
			StorageDir string `json:"storageDir"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.StorageDir) == "" {
			sendError(w, "路径不能为空", http.StatusBadRequest)
			return
		}
		newDir := strings.TrimSpace(req.StorageDir)
		if err := os.MkdirAll(newDir, 0755); err != nil {
			sendError(w, err.Error(), http.StatusBadRequest)
			return
		}
		os.MkdirAll(filepath.Join(newDir, ".temp"), 0755)
		config.StorageDir = newDir

		baseDir := filepath.Dir(config.WebDir)
		cfgFile := filepath.Join(baseDir, "config.json")
		data, _ := json.MarshalIndent(map[string]string{"storageDir": newDir}, "", "  ")
		os.WriteFile(cfgFile, data, 0644)

		sendJSON(w, map[string]interface{}{
			"status":     "ok",
			"storageDir": newDir,
		})
		return
	}

	drives := []map[string]string{}
	if runtime.GOOS == "windows" {
		for _, d := range "CDEFGHIJKLMNOPQRSTUVWXYZ" {
			drivePath := string(d) + ":\\"
			if _, err := os.Stat(drivePath); err == nil {
				drives = append(drives, map[string]string{
					"name":  string(d) + ":\\",
					"label": string(d) + ": 盘",
					"path":  filepath.Join(string(d)+":\\", "LAN_Share"),
				})
			}
		}
	}

	sendJSON(w, map[string]interface{}{
		"storageDir": config.StorageDir,
		"drives":     drives,
	})
}

func handleAPIFiles(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(config.StorageDir)
	if err != nil {
		sendJSON(w, []interface{}{})
		return
	}

	type fileItem struct {
		Name     string `json:"name"`
		Size     int64  `json:"size"`
		Modified string `json:"modified"`
	}

	var list []fileItem
	for _, entry := range entries {
		if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") || strings.HasSuffix(entry.Name(), ".part") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		list = append(list, fileItem{
			Name:     entry.Name(),
			Size:     info.Size(),
			Modified: info.ModTime().Format("2006-01-02T15:04:05"),
		})
	}

	sort.Slice(list, func(i, j int) bool {
		return list[i].Modified > list[j].Modified
	})

	sendJSON(w, list)
}

func handleAPIDeleteFile(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	cleanName := filepath.Base(body.Name)
	target := filepath.Join(config.StorageDir, cleanName)
	if err := os.Remove(target); err != nil {
		http.Error(w, "file not found", http.StatusNotFound)
		return
	}

	sendJSON(w, map[string]string{"status": "ok"})
}

func handleUploadInit(w http.ResponseWriter, r *http.Request) {
	var body struct {
		FileID      string `json:"fileId"`
		FileName    string `json:"fileName"`
		FileSize    int64  `json:"fileSize"`
		ChunkSize   int    `json:"chunkSize"`
		TotalChunks int    `json:"totalChunks"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	safeID := sanitizeID(body.FileID)
	sessionsLock.Lock()
	sess, exists := sessions[safeID]
	if !exists {
		sess = &FileSession{
			FileID:         safeID,
			FileName:       filepath.Base(body.FileName),
			FileSize:       body.FileSize,
			TotalChunks:    body.TotalChunks,
			ReceivedChunks: make(map[int]bool),
		}
		sessions[safeID] = sess
	}
	sessionsLock.Unlock()

	transfersLock.Lock()
	peerTransfers["up_"+safeID] = &PeerTransfer{
		ID:            "up_" + safeID,
		FileName:      sess.FileName,
		ClientIP:      getClientIP(r),
		DeviceName:    parseDeviceName(r.UserAgent()),
		Direction:     "upload",
		TotalBytes:    body.FileSize,
		Status:        "active",
		UpdatedAt:     time.Now(),
		LastTickTime:  time.Now(),
		LastTickBytes: 0,
	}
	transfersLock.Unlock()

	sess.Lock.RLock()
	var received []int
	for k := range sess.ReceivedChunks {
		received = append(received, k)
	}
	sess.Lock.RUnlock()

	partPath := filepath.Join(config.StorageDir, ".temp", safeID+".part")
	if _, err := os.Stat(partPath); os.IsNotExist(err) {
		if f, err := os.OpenFile(partPath, os.O_CREATE|os.O_WRONLY, 0644); err == nil {
			if body.FileSize > 0 {
				f.Truncate(body.FileSize)
			}
			f.Close()
		}
	}

	sendJSON(w, map[string]interface{}{
		"fileId":         safeID,
		"receivedChunks": received,
		"isComplete":     len(received) >= body.TotalChunks,
	})
}

func handleUploadChunk(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	fileID := sanitizeID(q.Get("fileId"))
	chunkIdx, _ := strconv.Atoi(q.Get("chunkIndex"))
	offset, _ := strconv.ParseInt(q.Get("offset"), 10, 64)

	sessionsLock.Lock()
	sess, exists := sessions[fileID]
	if !exists {
		sess = &FileSession{
			FileID:         fileID,
			ReceivedChunks: make(map[int]bool),
		}
		sessions[fileID] = sess
	}
	sessionsLock.Unlock()

	partPath := filepath.Join(config.StorageDir, ".temp", fileID+".part")
	file, err := os.OpenFile(partPath, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		http.Error(w, "cannot write file", http.StatusInternalServerError)
		return
	}
	defer file.Close()

	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		http.Error(w, "seek error", http.StatusInternalServerError)
		return
	}

	written, err := io.Copy(file, r.Body)
	if err != nil {
		http.Error(w, "stream copy error", http.StatusInternalServerError)
		return
	}

	sess.Lock.Lock()
	sess.ReceivedChunks[chunkIdx] = true
	sess.Lock.Unlock()

	transfersLock.Lock()
	if pt, ok := peerTransfers["up_"+fileID]; ok {
		pt.TransferredBytes += written
		if pt.TotalBytes > 0 && pt.TransferredBytes > pt.TotalBytes {
			pt.TransferredBytes = pt.TotalBytes
		}
		now := time.Now()
		dt := now.Sub(pt.LastTickTime).Seconds()
		if dt >= 0.25 {
			pt.SpeedBps = int64(float64(pt.TransferredBytes-pt.LastTickBytes) / dt)
			pt.LastTickBytes = pt.TransferredBytes
			pt.LastTickTime = now
		}
		pt.UpdatedAt = now
	}
	transfersLock.Unlock()

	sendJSON(w, map[string]interface{}{
		"status":     "ok",
		"chunkIndex": chunkIdx,
	})
}

func handleUploadFinish(w http.ResponseWriter, r *http.Request) {
	var body struct {
		FileID   string `json:"fileId"`
		FileName string `json:"fileName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	fileID := sanitizeID(body.FileID)
	fileName := filepath.Base(body.FileName)
	partPath := filepath.Join(config.StorageDir, ".temp", fileID+".part")

	if _, err := os.Stat(partPath); os.IsNotExist(err) {
		http.Error(w, "part file missing", http.StatusBadRequest)
		return
	}

	targetPath := filepath.Join(config.StorageDir, fileName)
	if _, err := os.Stat(targetPath); err == nil {
		ext := filepath.Ext(fileName)
		base := strings.TrimSuffix(fileName, ext)
		count := 1
		for {
			targetPath = filepath.Join(config.StorageDir, fmt.Sprintf("%s (%d)%s", base, count, ext))
			if _, err := os.Stat(targetPath); os.IsNotExist(err) {
				break
			}
			count++
		}
	}

	if err := os.Rename(partPath, targetPath); err != nil {
		http.Error(w, "cannot rename target file", http.StatusInternalServerError)
		return
	}

	transfersLock.Lock()
	if pt, ok := peerTransfers["up_"+fileID]; ok {
		pt.TransferredBytes = pt.TotalBytes
		pt.Status = "completed"
		pt.UpdatedAt = time.Now()
	}
	transfersLock.Unlock()

	sessionsLock.Lock()
	delete(sessions, fileID)
	sessionsLock.Unlock()

	sendJSON(w, map[string]interface{}{
		"status": "success",
		"name":   filepath.Base(targetPath),
	})
}

func handleDownload(w http.ResponseWriter, r *http.Request) {
	rawName := strings.TrimPrefix(r.URL.Path, "/download/")
	fileName := filepath.Base(rawName)
	filePath := filepath.Join(config.StorageDir, fileName)

	file, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer file.Close()

	fi, err := file.Stat()
	if err != nil {
		http.Error(w, "Stat error", http.StatusInternalServerError)
		return
	}

	clientIP := getClientIP(r)
	deviceName := parseDeviceName(r.UserAgent())
	dlID := fmt.Sprintf("dl_%s_%s", clientIP, sanitizeID(fileName))

	now := time.Now()
	transfersLock.Lock()
	pt := &PeerTransfer{
		ID:            dlID,
		FileName:      fileName,
		ClientIP:      clientIP,
		DeviceName:    deviceName,
		Direction:     "download",
		TotalBytes:    fi.Size(),
		Status:        "active",
		UpdatedAt:     now,
		LastTickTime:  now,
		LastTickBytes: 0,
	}
	peerTransfers[dlID] = pt
	transfersLock.Unlock()

	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))

	trackedWriter := &speedTrackingResponseWriter{
		ResponseWriter: w,
		transfer:       pt,
	}
	http.ServeContent(trackedWriter, r, fileName, fi.ModTime(), file)

	transfersLock.Lock()
	if pt.TransferredBytes >= pt.TotalBytes {
		pt.Status = "completed"
	} else {
		pt.Status = "interrupted"
	}
	pt.UpdatedAt = time.Now()
	transfersLock.Unlock()
}

type speedTrackingResponseWriter struct {
	http.ResponseWriter
	transfer *PeerTransfer
}

func (s *speedTrackingResponseWriter) Write(p []byte) (int, error) {
	n, err := s.ResponseWriter.Write(p)
	if n > 0 && s.transfer != nil {
		now := time.Now()
		transfersLock.Lock()
		s.transfer.TransferredBytes += int64(n)
		dt := now.Sub(s.transfer.LastTickTime).Seconds()
		if dt >= 0.22 {
			inst := int64(float64(s.transfer.TransferredBytes-s.transfer.LastTickBytes) / dt)
			if s.transfer.SpeedBps > 0 {
				s.transfer.SpeedBps = (s.transfer.SpeedBps*3 + inst*7) / 10
			} else {
				s.transfer.SpeedBps = inst
			}
			s.transfer.LastTickBytes = s.transfer.TransferredBytes
			s.transfer.LastTickTime = now
		}
		s.transfer.UpdatedAt = now
		transfersLock.Unlock()
	}
	return n, err
}

func handleClipboard(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var body struct {
			Text string `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err == nil {
			clipLock.Lock()
			clipboard.Text = body.Text
			clipboard.Updated = time.Now().Format("2006-01-02T15:04:05")
			clipLock.Unlock()
		}
		sendJSON(w, map[string]string{"status": "ok"})
		return
	}

	clipLock.RLock()
	data := clipboard
	clipLock.RUnlock()
	sendJSON(w, data)
}

func getClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	if host == "::1" {
		return "127.0.0.1"
	}
	return host
}

func parseDeviceName(ua string) string {
	if strings.Contains(ua, "iPhone") {
		return "iPhone"
	}
	if strings.Contains(ua, "iPad") {
		return "iPad"
	}
	if strings.Contains(ua, "Android") {
		return "Android"
	}
	if strings.Contains(ua, "Macintosh") {
		return "Mac"
	}
	if strings.Contains(ua, "Windows") {
		return "Windows PC"
	}
	return "Device"
}

func getLocalIPs() []string {
	var ips []string
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return []string{"127.0.0.1"}
	}

	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				ipStr := ipNet.IP.String()
				if !strings.HasPrefix(ipStr, "169.254.") {
					ips = append(ips, ipStr)
				}
			}
		}
	}
	if len(ips) == 0 {
		ips = append(ips, "127.0.0.1")
	}
	return ips
}

func findAvailablePort(startPort int) int {
	for p := startPort; p < startPort+50; p++ {
		ln, err := net.Listen("tcp", fmt.Sprintf(":%d", p))
		if err == nil {
			ln.Close()
			return p
		}
	}
	return startPort
}

func sanitizeID(id string) string {
	reg := regexp.MustCompile(`[^a-zA-Z0-9_\-]`)
	return reg.ReplaceAllString(id, "")
}

func sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	json.NewEncoder(w).Encode(data)
}

func sendError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func openBrowser(url string) {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "rundll32"
		args = []string{"url.dll,FileProtocolHandler", url}
	case "darwin":
		cmd = "open"
		args = []string{url}
	default:
		cmd = "xdg-open"
		args = []string{url}
	}
	exec.Command(cmd, args...).Start()
}
