/**
 * Şatafat Media — Apple iOS 26 / macOS Tahoe Liquid Glass 局域网千兆互传前端引擎
 * - 原生 SVG feDisplacementMap 光学折射 + 动态流体丝绸背景画布 + 实时跟随光标的焦散高光
 * - 扫码连接后双机自动/手动传输测速 (Ping 延迟 / 下行 MB/s / 上行 MB/s + 实时光波曲线 + 双端同步)
 * - 对方接收文件时实时监测对方的下载速度、进度百分比、已接收字节与剩余时间
 */

(function () {
  'use strict';

  const i18n = {
    zh: {
      brand_subtitle: 'Apple 光学折射液态玻璃 · 局域网千兆互传',
      device_detecting: '识别中...',
      device_iphone: 'iPhone / iPad',
      device_android: 'Android 手机',
      device_mac: 'Mac 电脑',
      device_windows: 'Windows 电脑',
      device_browser: '电脑终端',
      btn_scan_qr: '扫码互传',
      btn_install_app: '安装应用',
      wakelock_ready: '常亮就绪',
      wakelock_active: '防息屏已激活',
      wakelock_standby: '待机中',
      wakelock_fallback: '常亮保护中',
      ios_notice_title: 'iPhone / iPad 提示：',
      ios_notice_body: '传输超大文件时已自动激活屏幕防休眠保护，请保持 Safari 在当前前台页面。',
      tab_transfer: '文件互传',
      tab_clipboard: '文字同步',
      other_devices_title: '其他设备（手机/平板/电脑）浏览器访问地址',
      same_wifi_badge: '同一 Wi-Fi 直连',
      btn_copy_address: '复制网址',
      btn_show_qr: '扫码打开',
      label_other_ips: '多网卡切换：',
      storage_bar_title: '接收端存储位置',
      btn_change_storage: '更改目录',
      storage_free_badge: '可用 {free} / {total}',
      speedtest_title: '双机链路传输测速',
      speedtest_ready_badge: '扫码后自动测速',
      speedtest_testing_badge: '正在测速...',
      speedtest_synced_badge: '已测速: {device}',
      btn_run_speedtest: '立即测速',
      btn_testing_speed: '测速中...',
      metric_ping: '延迟 Ping',
      metric_down: '下行 (下载)',
      metric_up: '上行 (上传)',
      speedtest_hint: '手机扫码连接后将自动测试双机极限传输速率，也可随时点击测速',
      speedtest_step_ping: '正在测量双机局域网延迟 (Ping)...',
      speedtest_step_down: '正在测试双机下行峰值速率 (Download)...',
      speedtest_step_up: '正在测试双机上行峰值速率 (Upload)...',
      speedtest_result_summary: '⚡ 双机测速 ({device}) — 延迟 {ping}ms · 下行 {down} MB/s · 上行 {up} MB/s ({grade})',
      speed_grade_ultra: '千兆/Wi-Fi 6 极速链路',
      speed_grade_fast: '高速局域网链路',
      speed_grade_normal: '标准无线链路',
      live_monitor_title: '实时双机传输与对方接收速度监测',
      peer_downloading_badge: '📥 对方正在接收下载',
      peer_downloaded_badge: '✅ 对方已接收完成',
      peer_uploading_badge: '📤 对方正在发送上传',
      peer_uploaded_badge: '✅ 对方已上传完成',
      local_uploading_badge: '🚀 本机正在发送',
      local_completed_badge: '✅ 本机发送完成',
      drop_title: '拖拽文件至此投送，或点击选择文件',
      drop_desc: '支持 100GB+ 蓝光原盘与大文件流式分片、断点续传、实时监测对方接收下载速度',
      btn_select_files: '选择文件 / 视频 / 照片',
      btn_select_folder: '投送文件夹',
      task_waiting: '队列等待中...',
      task_uploading: '高速传输中...',
      task_completed: '✅ 传输完成',
      task_error: '❌ 中断',
      task_time_left: '剩余 {time}',
      shared_files_title: '局域网共享空间文件',
      search_placeholder: '搜索文件名...',
      th_name: '文件名',
      th_size: '大小',
      th_modified: '修改时间',
      th_actions: '操作',
      empty_files: '当前共享空间暂无文件，拖拽或选择文件即可极速分享',
      empty_search: '未找到匹配的文件',
      btn_download: '高速下载',
      btn_copy_link: '复制直链',
      btn_delete: '删除',
      clipboard_title: '跨设备剪贴板 / 文本即时互传',
      clipboard_subtitle: '手机与电脑秒速同步链接、长文本、代码或口令',
      clipboard_placeholder: '在此输入或粘贴文本，点击“发送到局域网”；另一端设备即可一键复制...',
      btn_send_clipboard: '发送到局域网',
      btn_copy_clipboard: '一键复制内容',
      clipboard_last_updated: '更新于 {time}',
      clipboard_just_now: '刚刚已同步',
      modal_storage_title: '📁 自定义接收端保存目录',
      modal_storage_desc: '其他手机或电脑向本机发送的文件将直接流式写入此目录。您可以一键切换到空间充裕的磁盘分区（如 1TB+ 的 E 盘）：',
      modal_quick_drives: '快捷磁盘分区选择：',
      modal_storage_input_label: '当前 / 自定义绝对路径：',
      btn_cancel: '取消',
      btn_save_switch: '保存并切换',
      modal_qr_title: '📱 扫码连接并自动测速',
      modal_qr_tip: '使用 <strong>iPhone 相机</strong> 或 <strong>安卓浏览器 / 微信扫一扫</strong>，打开后将自动进行双机传输测速',
      label_network_ip: '局域网网卡 IP：',
      btn_copy_url: '复制链接',
      modal_qr_note: '提示：请确保手机与电脑连接在同一个 Wi-Fi 或同一手机热点下',
      modal_ios_install_title: '📱 添加到 iPhone 主屏幕',
      ios_step1_title: '点击 Safari 底部栏“分享”图标',
      ios_step1_desc: '在屏幕正下方点击中间的方框向上箭头图标 ⎋',
      ios_step2_title: '选择“添加到主屏幕”',
      ios_step2_desc: '在弹出菜单中向下滑动，点击“添加到主屏幕” ➕',
      ios_step3_title: '点击右上角“添加”',
      ios_step3_desc: '即可在桌面生成独立液态玻璃全屏应用！',
      btn_got_it: '我知道了',
      footer_title: 'Şatafat Media • Apple iOS 26 Liquid Glass 光学局域网互传引擎',
      server_ready: '引擎就绪',
      server_info_badge: '端口: {port} | 接收目录: {dir}',
      toast_copied_link: '下载直链已复制！可发给其他设备或下载器',
      toast_copied_url: '链接已复制到剪贴板！',
      toast_copied_text: '已复制共享文字内容！',
      toast_access_url_copied: '访问网址已复制！可在其他设备浏览器粘贴打开',
      toast_upload_success: '🎉 文件投送完成: {name}',
      toast_upload_error: '传输失败: {name} ({err})',
      toast_delete_confirm: '确定要从共享空间删除 "{name}" 吗？',
      toast_deleted: '已删除: {name}',
      toast_delete_error: '删除失败',
      toast_clipboard_sent: '文字已同步到局域网所有设备！',
      toast_clipboard_error: '发送剪贴板失败',
      toast_copy_fallback_error: '复制失败，请手动复制',
      toast_app_installed: 'Şatafat Media 已成功安装到桌面！',
      toast_storage_updated: '接收端保存目录已切换至: {dir}',
      toast_storage_error: '目录切换失败: {err}',
      toast_speedtest_done: '⚡ 双机测速完成：下行 {down} MB/s · 上行 {up} MB/s',
      toast_wallpaper_changed: '🌈 已切换液态折射流光壁纸: {name}',
      unit_seconds: '秒',
      unit_minutes: '分',
      unit_hours: '时'
    },
    en: {
      brand_subtitle: 'Apple Optical Liquid Glass · Gigabit LAN Transfer',
      device_detecting: 'Detecting...',
      device_iphone: 'iPhone / iPad',
      device_android: 'Android Phone',
      device_mac: 'Mac',
      device_windows: 'Windows PC',
      device_browser: 'Desktop Web',
      btn_scan_qr: 'Scan & Test',
      btn_install_app: 'Install App',
      wakelock_ready: 'Awake Ready',
      wakelock_active: 'Keep-Awake Active',
      wakelock_standby: 'Standby',
      wakelock_fallback: 'Keep-Awake On',
      ios_notice_title: 'iPhone / iPad Tip: ',
      ios_notice_body: 'Keep-awake protection is active. Please keep Safari in the foreground during multi-GB transfers.',
      tab_transfer: 'AirTransfer',
      tab_clipboard: 'Text Sync',
      other_devices_title: 'Web URL for Other Devices (Phones / Tablets / PCs)',
      same_wifi_badge: 'Same Wi-Fi Direct',
      btn_copy_address: 'Copy URL',
      btn_show_qr: 'QR Code',
      label_other_ips: 'Switch NIC IP:',
      storage_bar_title: 'Receiver Storage Path',
      btn_change_storage: 'Change Path',
      storage_free_badge: 'Free {free} / {total}',
      speedtest_title: 'Dual-Device Link Speed Test',
      speedtest_ready_badge: 'Auto-Test on Scan',
      speedtest_testing_badge: 'Testing Link...',
      speedtest_synced_badge: 'Tested: {device}',
      btn_run_speedtest: 'Speed Test',
      btn_testing_speed: 'Testing...',
      metric_ping: 'Ping Latency',
      metric_down: 'Download',
      metric_up: 'Upload',
      speedtest_hint: 'Automatically benchmarks link speed after scanning QR code, or click Speed Test anytime',
      speedtest_step_ping: 'Measuring dual-device LAN ping latency...',
      speedtest_step_down: 'Benchmarking download throughput (MB/s)...',
      speedtest_step_up: 'Benchmarking upload throughput (MB/s)...',
      speedtest_result_summary: '⚡ Link Benchmark ({device}) — Ping {ping}ms · Down {down} MB/s · Up {up} MB/s ({grade})',
      speed_grade_ultra: 'Gigabit / Wi-Fi 6 Ultra Link',
      speed_grade_fast: 'High-Speed LAN Link',
      speed_grade_normal: 'Standard Wireless Link',
      live_monitor_title: 'Live Peer Transfer & Receiver Download Speed Monitor',
      peer_downloading_badge: '📥 Peer Downloading',
      peer_downloaded_badge: '✅ Peer Received',
      peer_uploading_badge: '📤 Peer Uploading',
      peer_uploaded_badge: '✅ Peer Uploaded',
      local_uploading_badge: '🚀 Sending File',
      local_completed_badge: '✅ Sent Complete',
      drop_title: 'Drop files here to AirTransfer, or click to browse',
      drop_desc: 'Supports 100GB+ streaming chunks, breakpoint resume, and real-time receiver download speed detection',
      btn_select_files: 'Select Files / Videos / Photos',
      btn_select_folder: 'Send Folder',
      task_waiting: 'Queued...',
      task_uploading: 'Transferring...',
      task_completed: '✅ Completed',
      task_error: '❌ Interrupted',
      task_time_left: '{time} left',
      shared_files_title: 'Shared LAN Space Files',
      search_placeholder: 'Search files...',
      th_name: 'File Name',
      th_size: 'Size',
      th_modified: 'Modified',
      th_actions: 'Actions',
      empty_files: 'No shared files yet. Drop or select files above to share instantly!',
      empty_search: 'No matching files found',
      btn_download: 'Download',
      btn_copy_link: 'Copy Link',
      btn_delete: 'Delete',
      clipboard_title: 'Instant Cross-Device Text & Clipboard Sync',
      clipboard_subtitle: 'Sync URLs, code snippets, or notes between phone and PC in milliseconds',
      clipboard_placeholder: 'Type or paste text here and click "Send to LAN"...',
      btn_send_clipboard: 'Send to LAN',
      btn_copy_clipboard: 'Copy Content',
      clipboard_last_updated: 'Updated {time}',
      clipboard_just_now: 'Synced just now',
      modal_storage_title: '📁 Customize Receiver Storage Folder',
      modal_storage_desc: 'Files sent from other devices are streamed directly into this folder. Pick a drive with plenty of free space:',
      modal_quick_drives: 'Quick Drive Selection:',
      modal_storage_input_label: 'Current / Custom Absolute Path:',
      btn_cancel: 'Cancel',
      btn_save_switch: 'Save & Switch',
      modal_qr_title: '📱 Scan to Connect & Auto-Benchmark',
      modal_qr_tip: 'Scan with <strong>iPhone Camera</strong> or <strong>Android Browser</strong> to connect and automatically run a dual-device speed test',
      label_network_ip: 'LAN Adapter IP:',
      btn_copy_url: 'Copy URL',
      modal_qr_note: 'Ensure your phone and computer are on the same Wi-Fi or hotspot',
      modal_ios_install_title: '📱 Add to iPhone Home Screen',
      ios_step1_title: 'Tap the Share icon in Safari',
      ios_step1_desc: 'Tap the bottom center Share button ⎋',
      ios_step2_title: 'Select "Add to Home Screen"',
      ios_step2_desc: 'Scroll down and tap "Add to Home Screen" ➕',
      ios_step3_title: 'Tap "Add" at top right',
      ios_step3_desc: 'Launch Şatafat Media as a full-screen Liquid Glass app!',
      btn_got_it: 'Got It',
      footer_title: 'Şatafat Media • Apple iOS 26 Liquid Glass LAN Engine',
      server_ready: 'Engine Ready',
      server_info_badge: 'Port: {port} | Storage: {dir}',
      toast_copied_link: 'Direct download link copied!',
      toast_copied_url: 'URL copied to clipboard!',
      toast_copied_text: 'Text copied to clipboard!',
      toast_access_url_copied: 'Access URL copied!',
      toast_upload_success: '🎉 File delivered: {name}',
      toast_upload_error: 'Transfer failed: {name} ({err})',
      toast_delete_confirm: 'Delete "{name}" from shared space?',
      toast_deleted: 'Deleted: {name}',
      toast_delete_error: 'Delete failed',
      toast_clipboard_sent: 'Text synced to all LAN devices!',
      toast_clipboard_error: 'Failed to sync clipboard',
      toast_copy_fallback_error: 'Copy failed, please select manually',
      toast_app_installed: 'Şatafat Media installed!',
      toast_storage_updated: 'Receiver storage path switched to: {dir}',
      toast_storage_error: 'Failed to switch path: {err}',
      toast_speedtest_done: '⚡ Link Speed: Down {down} MB/s · Up {up} MB/s',
      toast_wallpaper_changed: '🌈 Liquid Wallpaper: {name}',
      unit_seconds: 's',
      unit_minutes: 'm',
      unit_hours: 'h'
    },
    tr: {
      brand_subtitle: 'Apple Optik Liquid Glass · Gigabit Yerel Ağ Aktarımı',
      device_detecting: 'Algılanıyor...',
      device_iphone: 'iPhone / iPad',
      device_android: 'Android Telefon',
      device_mac: 'Mac',
      device_windows: 'Windows PC',
      device_browser: 'Web İstemcisi',
      btn_scan_qr: 'QR & Hız Testi',
      btn_install_app: 'Uygulamayı Kur',
      wakelock_ready: 'Ekran Hazır',
      wakelock_active: 'Uyanık Tutma Aktif',
      wakelock_standby: 'Beklemede',
      wakelock_fallback: 'Koruma Aktif',
      ios_notice_title: 'iPhone / iPad İpucu: ',
      ios_notice_body: 'Büyük dosya aktarımı sırasında ekran koruma aktiftir. Lütfen Safari\'yi ön planda tutun.',
      tab_transfer: 'Dosya Aktarımı',
      tab_clipboard: 'Metin Eşitleme',
      other_devices_title: 'Diğer Cihazlar (Telefon / Tablet / PC) İçin Erişim Adresi',
      same_wifi_badge: 'Aynı Wi-Fi Doğrudan Bağlantı',
      btn_copy_address: 'Adresi Kopyala',
      btn_show_qr: 'QR Göster',
      label_other_ips: 'Ağ Kartı Seçimi:',
      storage_bar_title: 'Alıcı Kayıt Klasörü',
      btn_change_storage: 'Klasör Değiştir',
      storage_free_badge: 'Boş {free} / {total}',
      speedtest_title: 'İki Cihaz Arası Hız Testi',
      speedtest_ready_badge: 'QR Sonrası Otomatik Test',
      speedtest_testing_badge: 'Test Ediliyor...',
      speedtest_synced_badge: 'Test: {device}',
      btn_run_speedtest: 'Hız Testi Yap',
      btn_testing_speed: 'Ölçülüyor...',
      metric_ping: 'Gecikme Ping',
      metric_down: 'İndirme (Down)',
      metric_up: 'Yükleme (Up)',
      speedtest_hint: 'QR kod tarandıktan sonra iki cihaz arasındaki hız otomatik ölçülür veya istediğinizde tıklayın',
      speedtest_step_ping: 'Cihazlar arası gecikme (Ping) ölçülüyor...',
      speedtest_step_down: 'İndirme (Download) hızı test ediliyor...',
      speedtest_step_up: 'Yükleme (Upload) hızı test ediliyor...',
      speedtest_result_summary: '⚡ Hız Testi ({device}) — Ping {ping}ms · İndirme {down} MB/s · Yükleme {up} MB/s ({grade})',
      speed_grade_ultra: 'Gigabit / Wi-Fi 6 Ultra Bağlantı',
      speed_grade_fast: 'Yüksek Hızlı Ağ Bağlantısı',
      speed_grade_normal: 'Standart Kablosuz Bağlantı',
      live_monitor_title: 'Canlı Aktarım ve Karşı Taraf İndirme Hızı İzleyici',
      peer_downloading_badge: '📥 Karşı Cihaz İndiriyor',
      peer_downloaded_badge: '✅ Karşı Cihaz İndirdi',
      peer_uploading_badge: '📤 Karşı Cihaz Gönderiyor',
      peer_uploaded_badge: '✅ Karşı Cihaz Gönderdi',
      local_uploading_badge: '🚀 Gönderiliyor',
      local_completed_badge: '✅ Gönderim Tamamlandı',
      drop_title: 'Dosyaları buraya sürükleyin veya seçmek için tıklayın',
      drop_desc: '100GB+ kesintisiz parça aktarım, kaldığı yerden devam ve karşı cihazın indirme hızını canlı izleme',
      btn_select_files: 'Dosya / Video / Fotoğraf Seç',
      btn_select_folder: 'Klasör Gönder',
      task_waiting: 'Sırada...',
      task_uploading: 'Aktarılıyor...',
      task_completed: '✅ Tamamlandı',
      task_error: '❌ Duraklatıldı',
      task_time_left: 'Kalan {time}',
      shared_files_title: 'Paylaşılan Yerel Ağ Dosyaları',
      search_placeholder: 'Dosya ara...',
      th_name: 'Dosya Adı',
      th_size: 'Boyut',
      th_modified: 'Tarih',
      th_actions: 'İşlemler',
      empty_files: 'Henüz paylaşılan dosya yok. Anında paylaşmak için dosya sürükleyin!',
      empty_search: 'Eşleşen dosya bulunamadı',
      btn_download: 'Hızlı İndir',
      btn_copy_link: 'Link Kopyala',
      btn_delete: 'Sil',
      clipboard_title: 'Cihazlar Arası Anında Pano ve Metin Eşitleme',
      clipboard_subtitle: 'Telefon ve bilgisayar arasında bağlantıları ve metinleri anında paylaşın',
      clipboard_placeholder: 'Metni buraya yapıştırın ve "Ağa Gönder"e tıklayın...',
      btn_send_clipboard: 'Ağa Gönder',
      btn_copy_clipboard: 'Metni Kopyala',
      clipboard_last_updated: 'Güncellendi: {time}',
      clipboard_just_now: 'Az önce eşitlendi',
      modal_storage_title: '📁 Alıcı Depolama Klasörünü Seç',
      modal_storage_desc: 'Diğer cihazlardan gönderilen dosyalar doğrudan bu klasöre kaydedilir. Geniş boş alanı olan bir sürücü seçin:',
      modal_quick_drives: 'Hızlı Sürücü Seçimi:',
      modal_storage_input_label: 'Mevcut / Özel Tam Yol:',
      btn_cancel: 'İptal',
      btn_save_switch: 'Kaydet ve Geç',
      modal_qr_title: '📱 QR Tara ve Otomatik Hız Testi Yap',
      modal_qr_tip: '<strong>iPhone Kamerası</strong> veya <strong>Android Tarayıcısı</strong> ile tarayın; açıldığında otomatik hız testi başlar',
      label_network_ip: 'Yerel Ağ IP:',
      btn_copy_url: 'Adresi Kopyala',
      modal_qr_note: 'Telefon ve bilgisayarın aynı Wi-Fi ağına bağlı olduğundan emin olun',
      modal_ios_install_title: '📱 iPhone Ana Ekrana Ekle',
      ios_step1_title: 'Safari Paylaş simgesine dokunun',
      ios_step1_desc: 'Alt çubuktaki Paylaş ⎋ düğmesine basın',
      ios_step2_title: '"Ana Ekrana Ekle"ye dokunun',
      ios_step2_desc: 'Menüde aşağı kaydırıp "Ana Ekrana Ekle" ➕ seçin',
      ios_step3_title: 'Sağ üstten "Ekle"ye basın',
      ios_step3_desc: 'Tam ekran Liquid Glass uygulaması olarak kullanın!',
      btn_got_it: 'Anladım',
      footer_title: 'Şatafat Media • Apple iOS 26 Liquid Glass Ağ Motoru',
      server_ready: 'Motor Hazır',
      server_info_badge: 'Port: {port} | Klasör: {dir}',
      toast_copied_link: 'İndirme bağlantısı kopyalandı!',
      toast_copied_url: 'Adres panoya kopyalandı!',
      toast_copied_text: 'Metin kopyalandı!',
      toast_access_url_copied: 'Erişim adresi kopyalandı!',
      toast_upload_success: '🎉 Dosya aktarıldı: {name}',
      toast_upload_error: 'Aktarım hatası: {name} ({err})',
      toast_delete_confirm: '"{name}" dosyasını silmek istiyor musunuz?',
      toast_deleted: 'Silindi: {name}',
      toast_delete_error: 'Silinemedi',
      toast_clipboard_sent: 'Metin tüm cihazlara gönderildi!',
      toast_clipboard_error: 'Pano gönderilemedi',
      toast_copy_fallback_error: 'Kopyalanamadı, lütfen seçerek kopyalayın',
      toast_app_installed: 'Şatafat Media kuruldu!',
      toast_storage_updated: 'Kayıt klasörü değiştirildi: {dir}',
      toast_storage_error: 'Klasör değiştirilemedi: {err}',
      toast_speedtest_done: '⚡ Hız Testi: İndirme {down} MB/s · Yükleme {up} MB/s',
      toast_wallpaper_changed: '🌈 Liquid Arka Plan: {name}',
      unit_seconds: 'sn',
      unit_minutes: 'dk',
      unit_hours: 'sa'
    }
  };

  const CHUNK_SIZE = 8 * 1024 * 1024;
  const CONCURRENCY = 1;
  const GAUGE_MAX_ARC = 170;

  // 4 套 Apple iOS 26 / macOS Tahoe 高对比度流光壁纸色系（专门用于强化上层玻璃的光学折射弯曲效果）
  const WALLPAPER_PRESETS = [
    {
      id: 'ios26',
      name: 'iOS 26 Iridescent 幻彩琉璃',
      bgDark: '#060c1f',
      bgLight: '#dbeafe',
      waves: ['rgba(0, 242, 254, 0.55)', 'rgba(10, 132, 255, 0.52)', 'rgba(192, 132, 252, 0.48)', 'rgba(48, 209, 88, 0.36)']
    },
    {
      id: 'tahoe',
      name: 'macOS Tahoe 极光海湾',
      bgDark: '#041421',
      bgLight: '#d1fae5',
      waves: ['rgba(45, 212, 191, 0.58)', 'rgba(56, 189, 248, 0.54)', 'rgba(14, 165, 233, 0.48)', 'rgba(16, 185, 129, 0.42)']
    },
    {
      id: 'sunset',
      name: 'Solar Prism 落日棱镜',
      bgDark: '#16071f',
      bgLight: '#fce7f3',
      waves: ['rgba(244, 63, 94, 0.54)', 'rgba(251, 146, 60, 0.50)', 'rgba(192, 132, 252, 0.52)', 'rgba(56, 189, 248, 0.42)']
    },
    {
      id: 'vision',
      name: 'visionOS 钛金水晶',
      bgDark: '#0b1120',
      bgLight: '#e2e8f0',
      waves: ['rgba(125, 211, 252, 0.55)', 'rgba(165, 180, 252, 0.50)', 'rgba(226, 232, 240, 0.38)', 'rgba(56, 189, 248, 0.45)']
    }
  ];

  const state = {
    currentLang: localStorage.getItem('landrop_lang') || 'zh',
    theme: localStorage.getItem('satafat_theme') || 'dark',
    wallpaperIdx: Number(localStorage.getItem('satafat_wp_idx') || 0) % WALLPAPER_PRESETS.length,
    serverInfo: null,
    files: [],
    uploadQueue: [],
    peerTransfers: [],
    activeIps: [],
    currentIp: '',
    wakeLockSentinel: null,
    deferredInstallPrompt: null,
    isIOS: false,
    storageConfig: null,
    isSpeedTesting: false,
    lastSpeedTestTs: '',
    detectedDeviceLabel: 'PC',
    waveSamples: [12, 28, 45, 62, 54, 78, 86, 72, 92, 88, 95, 90]
  };

  const dom = {
    liquidWallpaperCanvas: document.getElementById('liquidWallpaperCanvas'),
    speedWaveCanvas: document.getElementById('speedWaveCanvas'),
    langSelect: document.getElementById('langSelect'),
    btnWallpaperCycle: document.getElementById('btnWallpaperCycle'),
    btnThemeToggle: document.getElementById('btnThemeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    btnInstallApp: document.getElementById('btnInstallApp'),
    iosInstallModal: document.getElementById('iosInstallModal'),
    btnCloseIosInstall: document.getElementById('btnCloseIosInstall'),
    btnGotItIos: document.getElementById('btnGotItIos'),
    accessAddressCard: document.getElementById('accessAddressCard'),
    accessUrlPill: document.getElementById('accessUrlPill'),
    accessUrlText: document.getElementById('accessUrlText'),
    btnCopyAccessUrl: document.getElementById('btnCopyAccessUrl'),
    btnQuickQr: document.getElementById('btnQuickQr'),
    multiIpNotice: document.getElementById('multiIpNotice'),
    otherIpsContainer: document.getElementById('otherIpsContainer'),
    storageFreeBadge: document.getElementById('storageFreeBadge'),
    storagePathDisplay: document.getElementById('storagePathDisplay'),
    btnOpenChangeDir: document.getElementById('btnOpenChangeDir'),
    storageModal: document.getElementById('storageModal'),
    btnCloseStorageModal: document.getElementById('btnCloseStorageModal'),
    btnCancelStorage: document.getElementById('btnCancelStorage'),
    btnSaveStorage: document.getElementById('btnSaveStorage'),
    quickDrivesContainer: document.getElementById('quickDrivesContainer'),
    customStorageInput: document.getElementById('customStorageInput'),
    speedTestCard: document.getElementById('speedTestCard'),
    speedTestPeerBadge: document.getElementById('speedTestPeerBadge'),
    btnRunSpeedTest: document.getElementById('btnRunSpeedTest'),
    btnRunSpeedTestText: document.getElementById('btnRunSpeedTestText'),
    gaugeArcFill: document.getElementById('gaugeArcFill'),
    gaugeMainValue: document.getElementById('gaugeMainValue'),
    gaugeMainUnit: document.getElementById('gaugeMainUnit'),
    metricPingVal: document.getElementById('metricPingVal'),
    metricDownVal: document.getElementById('metricDownVal'),
    metricUpVal: document.getElementById('metricUpVal'),
    speedStatusDot: document.getElementById('speedStatusDot'),
    speedSummaryText: document.getElementById('speedSummaryText'),
    liveMonitorCard: document.getElementById('liveMonitorCard'),
    queueOverallStats: document.getElementById('queueOverallStats'),
    tasksList: document.getElementById('tasksList'),
    peerTransfersList: document.getElementById('peerTransfersList'),
    deviceName: document.getElementById('deviceName'),
    deviceBadge: document.getElementById('deviceBadge'),
    wakeLockText: document.getElementById('wakeLockText'),
    wakeLockStatus: document.getElementById('wakeLockStatus'),
    iosNotice: document.getElementById('iosNotice'),
    btnOpenQr: document.getElementById('btnOpenQr'),
    btnCloseQr: document.getElementById('btnCloseQr'),
    qrModal: document.getElementById('qrModal'),
    qrcodeContainer: document.getElementById('qrcode'),
    ipSelect: document.getElementById('ipSelect'),
    directUrlInput: document.getElementById('directUrlInput'),
    btnCopyUrl: document.getElementById('btnCopyUrl'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    folderInput: document.getElementById('folderInput'),
    btnSelectFiles: document.getElementById('btnSelectFiles'),
    btnSelectFolder: document.getElementById('btnSelectFolder'),
    filesTableBody: document.getElementById('filesTableBody'),
    fileCountBadge: document.getElementById('fileCountBadge'),
    btnRefreshFiles: document.getElementById('btnRefreshFiles'),
    searchFilesInput: document.getElementById('searchFilesInput'),
    clipboardInput: document.getElementById('clipboardInput'),
    btnSendClipboard: document.getElementById('btnSendClipboard'),
    btnCopyClipboard: document.getElementById('btnCopyClipboard'),
    clipboardTime: document.getElementById('clipboardTime'),
    serverInfoBadge: document.getElementById('serverInfoBadge'),
    toastContainer: document.getElementById('toastContainer'),
    keepAwakeVideo: document.getElementById('keepAwakeVideo')
  };

  let qrcodeInstance = null;

  function t(key, params = {}) {
    const dict = i18n[state.currentLang] || i18n.zh;
    let str = dict[key] !== undefined ? dict[key] : (i18n.zh[key] || key);
    for (const p in params) {
      str = str.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
    }
    return str;
  }

  function applyTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('satafat_theme', state.theme);
    if (dom.themeIcon) {
      dom.themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
    }
  }

  function setLanguage(lang) {
    if (!i18n[lang]) lang = 'zh';
    state.currentLang = lang;
    localStorage.setItem('landrop_lang', lang);
    if (dom.langSelect) dom.langSelect.value = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (k && (i18n[lang][k] !== undefined || i18n.zh[k] !== undefined)) {
        el.innerHTML = t(k);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (k && (i18n[lang][k] !== undefined || i18n.zh[k] !== undefined)) {
        el.setAttribute('placeholder', t(k));
      }
    });

    detectDevice();
    updateServerInfoBadge();
    updateStorageDisplay();
    renderLiveMonitor();
    renderFilesTable();
  }

  /* ==============================================================
   * 1. 实时速率曲线（壁纸 / 玻璃折射 / 镜面高光见 liquid-glass.js）
   * ============================================================== */
  function pushWaveSample(mbps) {
    state.waveSamples.push(Math.max(2, Number(mbps) || 2));
    if (state.waveSamples.length > 28) state.waveSamples.shift();
    drawSpeedWaveform();
  }

  function drawSpeedWaveform() {
    const cvs = dom.speedWaveCanvas;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    ctx.clearRect(0, 0, w, h);

    const arr = state.waveSamples;
    if (arr.length < 2) return;
    const maxVal = Math.max(100, ...arr);

    ctx.beginPath();
    arr.forEach((v, idx) => {
      const x = (idx / (arr.length - 1)) * w;
      const y = h - 5 - (v / maxVal) * (h - 12);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#0a84ff';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(10, 132, 255, 0.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
    fillGrad.addColorStop(0, 'rgba(10, 132, 255, 0.32)');
    fillGrad.addColorStop(1, 'rgba(10, 132, 255, 0)');
    ctx.fillStyle = fillGrad;
    ctx.fill();
  }

  /* ==============================================================
   * 2. 初始化与生命周期
   * ============================================================== */
  function init() {
    applyTheme(state.theme);
    // 壁纸与镜面高光由 liquid-glass.js 渲染，这里只同步当前选择的壁纸
    document.documentElement.setAttribute('data-wallpaper', WALLPAPER_PRESETS[state.wallpaperIdx].id);
    drawSpeedWaveform();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    initPWAInstallation();

    if (dom.langSelect) {
      dom.langSelect.value = state.currentLang;
      dom.langSelect.addEventListener('change', (e) => setLanguage(e.target.value));
    }

    setLanguage(state.currentLang);
    initWakeLock();
    bindEvents();
    fetchServerInfo();
    fetchStorageConfig();
    loadFiles();
    loadClipboard();
    pollTransfers();

    setInterval(loadFiles, 5000);
    setInterval(loadClipboard, 5000);
    setInterval(pollTransfers, 1000);

    // 扫码进入 (?scan=1) 或首次打开页面时，自动运行一次双机链路测速
    checkAutoSpeedTestOnScan();
  }

  function checkAutoSpeedTestOnScan() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isScanParam = urlParams.get('scan') === '1';
      const autoTestedSession = sessionStorage.getItem('satafat_auto_speedtested') === '1';

      if (isScanParam) {
        const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }

      if (isScanParam || !autoTestedSession) {
        sessionStorage.setItem('satafat_auto_speedtested', '1');
        setTimeout(() => {
          if (!state.lastSpeedTestTs) {
            runSpeedTest(true);
          }
        }, 700);
      }
    } catch (e) {}
  }

  /* ==============================================================
   * 3. 双机链路传输测速引擎 (Ping / Download / Upload + 双端实时同步)
   * ============================================================== */
  function setGaugeSpeed(mbps) {
    if (!dom.gaugeArcFill || !dom.gaugeMainValue) return;
    const val = Math.max(0, Number(mbps) || 0);
    dom.gaugeMainValue.textContent = val > 0 ? val.toFixed(1) : '0.0';

    const ratio = Math.min(1, Math.pow(val / 135, 0.65));
    const offset = GAUGE_MAX_ARC - ratio * GAUGE_MAX_ARC;
    dom.gaugeArcFill.style.strokeDashoffset = offset.toFixed(1);
    pushWaveSample(val);
  }

  function getSpeedGrade(peakMbps) {
    if (peakMbps >= 45) return t('speed_grade_ultra');
    if (peakMbps >= 15) return t('speed_grade_fast');
    return t('speed_grade_normal');
  }

  async function runSpeedTest(isAutoScan = false) {
    if (state.isSpeedTesting) return;
    state.isSpeedTesting = true;

    if (dom.btnRunSpeedTest) dom.btnRunSpeedTest.disabled = true;
    if (dom.btnRunSpeedTestText) dom.btnRunSpeedTestText.textContent = t('btn_testing_speed');
    if (dom.speedStatusDot) dom.speedStatusDot.className = 'summary-dot testing';
    if (dom.speedTestPeerBadge) dom.speedTestPeerBadge.textContent = t('speedtest_testing_badge');

    let pingMs = 1;
    let downMBps = 0;
    let upMBps = 0;

    try {
      // 阶段 1：测量双机 Ping 往返延迟
      if (dom.speedSummaryText) dom.speedSummaryText.textContent = t('speedtest_step_ping');
      const pings = [];
      for (let i = 0; i < 3; i++) {
        const t0 = performance.now();
        await fetch('/api/speedtest/ping?t=' + Date.now() + '_' + i, { cache: 'no-store' });
        const rtt = Math.max(1, Math.round(performance.now() - t0));
        pings.push(rtt);
      }
      pingMs = Math.min(...pings);
      if (dom.metricPingVal) dom.metricPingVal.textContent = String(pingMs);

      // 阶段 2：测量双机下行速率 (24MB 内存零磁盘流式读取)
      if (dom.speedSummaryText) dom.speedSummaryText.textContent = t('speedtest_step_down');
      const downSizeBytes = 24 * 1024 * 1024;
      const downStart = performance.now();
      const downRes = await fetch('/api/speedtest/down?size=' + downSizeBytes + '&t=' + Date.now(), { cache: 'no-store' });

      if (downRes.body && downRes.body.getReader) {
        const reader = downRes.body.getReader();
        let received = 0;
        let lastTick = downStart;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          const now = performance.now();
          if (now - lastTick >= 80) {
            const elapsedSec = (now - downStart) / 1000;
            if (elapsedSec > 0) {
              const liveMbps = (received / (1024 * 1024)) / elapsedSec;
              setGaugeSpeed(liveMbps);
              if (dom.metricDownVal) dom.metricDownVal.textContent = liveMbps.toFixed(1);
            }
            lastTick = now;
          }
        }
        const totalDownSec = Math.max(0.05, (performance.now() - downStart) / 1000);
        downMBps = Number(((received / (1024 * 1024)) / totalDownSec).toFixed(1));
      } else {
        const buf = await downRes.arrayBuffer();
        const totalDownSec = Math.max(0.05, (performance.now() - downStart) / 1000);
        downMBps = Number(((buf.byteLength / (1024 * 1024)) / totalDownSec).toFixed(1));
      }
      setGaugeSpeed(downMBps);
      if (dom.metricDownVal) dom.metricDownVal.textContent = downMBps.toFixed(1);

      // 阶段 3：测量双机上行速率 (分 2 次发送 8MB 内存块，共 16MB)
      if (dom.speedSummaryText) dom.speedSummaryText.textContent = t('speedtest_step_up');
      const upChunkSize = 8 * 1024 * 1024;
      const dummyPayload = new Uint8Array(upChunkSize);
      for (let i = 0; i < upChunkSize; i += 4096) {
        dummyPayload[i] = (i & 0xff);
      }

      const upStart = performance.now();
      let totalUpBytes = 0;
      for (let step = 0; step < 2; step++) {
        await fetch('/api/speedtest/up?t=' + Date.now() + '_' + step, {
          method: 'POST',
          body: dummyPayload
        });
        totalUpBytes += upChunkSize;
        const elapsedUp = Math.max(0.05, (performance.now() - upStart) / 1000);
        const liveUpMbps = (totalUpBytes / (1024 * 1024)) / elapsedUp;
        setGaugeSpeed(liveUpMbps);
        if (dom.metricUpVal) dom.metricUpVal.textContent = liveUpMbps.toFixed(1);
      }
      const totalUpSec = Math.max(0.05, (performance.now() - upStart) / 1000);
      upMBps = Number(((totalUpBytes / (1024 * 1024)) / totalUpSec).toFixed(1));
      if (dom.metricUpVal) dom.metricUpVal.textContent = upMBps.toFixed(1);

      const peak = Math.max(downMBps, upMBps);
      setGaugeSpeed(peak);

      // 阶段 4：同步测速结果至服务端，让双端同时显示
      const reportRes = await fetch('/api/speedtest/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: state.detectedDeviceLabel,
          pingMs: pingMs,
          downMBps: downMBps,
          upMBps: upMBps
        })
      });
      if (reportRes.ok) {
        const saved = await reportRes.json();
        if (saved && saved.timestamp) {
          state.lastSpeedTestTs = saved.timestamp;
        }
      }

      if (dom.speedStatusDot) dom.speedStatusDot.className = 'summary-dot done';
      if (dom.speedTestPeerBadge) {
        dom.speedTestPeerBadge.textContent = t('speedtest_synced_badge', { device: state.detectedDeviceLabel });
      }
      if (dom.speedSummaryText) {
        dom.speedSummaryText.textContent = t('speedtest_result_summary', {
          device: state.detectedDeviceLabel,
          ping: pingMs,
          down: downMBps.toFixed(1),
          up: upMBps.toFixed(1),
          grade: getSpeedGrade(peak)
        });
      }

      if (!isAutoScan) {
        showToast(t('toast_speedtest_done', { down: downMBps.toFixed(1), up: upMBps.toFixed(1) }), 'success');
      }
    } catch (err) {
      if (dom.speedStatusDot) dom.speedStatusDot.className = 'summary-dot';
    } finally {
      state.isSpeedTesting = false;
      if (dom.btnRunSpeedTest) dom.btnRunSpeedTest.disabled = false;
      if (dom.btnRunSpeedTestText) dom.btnRunSpeedTestText.textContent = t('btn_run_speedtest');
    }
  }

  function applyRemoteSpeedTestResult(st) {
    if (!st || !st.timestamp || st.timestamp === state.lastSpeedTestTs || state.isSpeedTesting) return;
    state.lastSpeedTestTs = st.timestamp;

    const ping = st.pingMs || 1;
    const down = Number(st.downMBps || 0);
    const up = Number(st.upMBps || 0);
    const peak = Math.max(down, up);
    const dev = st.deviceName || 'Peer';

    if (dom.metricPingVal) dom.metricPingVal.textContent = String(ping);
    if (dom.metricDownVal) dom.metricDownVal.textContent = down.toFixed(1);
    if (dom.metricUpVal) dom.metricUpVal.textContent = up.toFixed(1);
    setGaugeSpeed(peak);

    if (dom.speedStatusDot) dom.speedStatusDot.className = 'summary-dot done';
    if (dom.speedTestPeerBadge) {
      dom.speedTestPeerBadge.textContent = t('speedtest_synced_badge', { device: dev });
    }
    if (dom.speedSummaryText) {
      dom.speedSummaryText.textContent = t('speedtest_result_summary', {
        device: dev,
        ping: ping,
        down: down.toFixed(1),
        up: up.toFixed(1),
        grade: getSpeedGrade(peak)
      });
    }
  }

  /* ==============================================================
   * 4. 实时监测对方接收下载速度与双机活跃传输 (/api/transfers)
   * ============================================================== */
  async function pollTransfers() {
    try {
      const res = await fetch('/api/transfers', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      if (data.latestSpeedTest && data.latestSpeedTest.timestamp) {
        applyRemoteSpeedTestResult(data.latestSpeedTest);
      }

      state.peerTransfers = Array.isArray(data.transfers) ? data.transfers : [];

      // 如果有正在进行的对方下载，将实时速度推入波形图
      const activePeer = state.peerTransfers.find(p => p.status === 'active' && p.speedBps > 0);
      if (activePeer && !state.isSpeedTesting) {
        const liveMbps = activePeer.speedBps / (1024 * 1024);
        pushWaveSample(liveMbps);
      }

      renderLiveMonitor();
    } catch (e) {}
  }

  function renderLiveMonitor() {
    if (!dom.liveMonitorCard) return;

    const hasLocalUploads = state.uploadQueue.length > 0;
    const localFileNamesUploading = new Set(
      state.uploadQueue.filter(u => u.status === 'uploading').map(u => u.name)
    );

    const visiblePeers = state.peerTransfers.filter(pt => {
      if (pt.direction === 'download') return true;
      if (pt.direction === 'upload' && !localFileNamesUploading.has(pt.fileName)) return true;
      return false;
    });

    if (!hasLocalUploads && visiblePeers.length === 0) {
      dom.liveMonitorCard.style.display = 'none';
      return;
    }

    dom.liveMonitorCard.style.display = 'block';

    let totalLiveSpeedBps = 0;
    state.uploadQueue.forEach(u => {
      if (u.status === 'uploading') totalLiveSpeedBps += (u.speed || 0);
    });
    visiblePeers.forEach(pt => {
      if (pt.status === 'active') totalLiveSpeedBps += (pt.speedBps || 0);
    });

    if (dom.queueOverallStats) {
      dom.queueOverallStats.textContent = totalLiveSpeedBps > 0
        ? `⚡ ${formatSpeed(totalLiveSpeedBps)}`
        : '';
    }

    // 1. 本机上传任务列表
    if (dom.tasksList) {
      dom.tasksList.innerHTML = '';
      state.uploadQueue.forEach(task => {
        const percent = task.size > 0 ? Math.min(100, Math.round((task.uploadedBytes / task.size) * 100)) : 0;
        const isUploading = task.status === 'uploading';
        const badgeText = task.status === 'completed' ? t('local_completed_badge') : t('local_uploading_badge');
        let etaText = '';
        if (isUploading && task.speed > 0) {
          const remain = Math.max(0, task.size - task.uploadedBytes);
          etaText = t('task_time_left', { time: formatTime(Math.round(remain / task.speed)) });
        } else if (task.status === 'completed') {
          etaText = t('task_completed');
        } else if (task.status === 'error') {
          etaText = `${t('task_error')}: ${task.errorMsg}`;
        }

        const el = document.createElement('div');
        el.className = 'transfer-item-glass';
        el.innerHTML = `
          <div class="transfer-row-top">
            <div class="transfer-file-meta">
              <span class="transfer-direction-pill pill-up">${badgeText}</span>
              <span class="transfer-filename" title="${escapeHtml(task.name)}">${escapeHtml(task.name)}</span>
            </div>
            <div class="transfer-speed-cluster">
              <span class="transfer-live-speed up-speed">${isUploading ? formatSpeed(task.speed) : ''}</span>
              <span class="transfer-pct">${percent}%</span>
            </div>
          </div>
          <div class="liquid-progress-track">
            <div class="liquid-progress-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="transfer-row-bottom">
            <span>${formatBytes(task.uploadedBytes)} / ${formatBytes(task.size)}</span>
            <span>${etaText}</span>
          </div>
        `;
        dom.tasksList.appendChild(el);
      });
    }

    // 2. 对方接收下载 / 远端设备传输实时速度列表
    if (dom.peerTransfersList) {
      dom.peerTransfersList.innerHTML = '';
      visiblePeers.forEach(pt => {
        const isDown = pt.direction === 'download';
        const isActive = pt.status === 'active';
        const total = pt.totalBytes || 0;
        const done = pt.transferredBytes || 0;
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : (isActive ? 50 : 100);
        const speedBps = isActive ? (pt.speedBps || 0) : 0;

        let dirBadge = '';
        if (isDown) {
          dirBadge = pt.status === 'completed' ? t('peer_downloaded_badge') : t('peer_downloading_badge');
        } else {
          dirBadge = pt.status === 'completed' ? t('peer_uploaded_badge') : t('peer_uploading_badge');
        }

        let etaStr = '';
        if (isActive && speedBps > 0 && total > done) {
          const secLeft = Math.round((total - done) / speedBps);
          etaStr = t('task_time_left', { time: formatTime(secLeft) });
        } else if (pt.status === 'completed') {
          etaStr = '100%';
        }

        const peerLabel = `${pt.deviceName || 'Peer'} · ${pt.clientIp || ''}`;

        const item = document.createElement('div');
        item.className = 'transfer-item-glass' + (isDown && isActive ? ' peer-download-active' : '');
        item.innerHTML = `
          <div class="transfer-row-top">
            <div class="transfer-file-meta">
              <span class="transfer-direction-pill ${isDown ? 'pill-down' : 'pill-up'}">${dirBadge}</span>
              <span class="transfer-filename" title="${escapeHtml(pt.fileName)}">${escapeHtml(pt.fileName)}</span>
              <span class="transfer-peer-device">${escapeHtml(peerLabel)}</span>
            </div>
            <div class="transfer-speed-cluster">
              <span class="transfer-live-speed ${isDown ? '' : 'up-speed'}">${isActive ? formatSpeed(speedBps) : ''}</span>
              <span class="transfer-pct">${pct}%</span>
            </div>
          </div>
          <div class="liquid-progress-track">
            <div class="liquid-progress-fill" style="width: ${pct}%;"></div>
          </div>
          <div class="transfer-row-bottom">
            <span>${formatBytes(done)} / ${formatBytes(total)}</span>
            <span>${etaStr}</span>
          </div>
        `;
        dom.peerTransfersList.appendChild(item);
      });
    }
  }

  /* ==============================================================
   * 5. PWA 安装与防休眠唤醒锁
   * ============================================================== */
  function initPWAInstallation() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      if (dom.btnInstallApp) dom.btnInstallApp.style.display = 'none';
      return;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredInstallPrompt = e;
      if (dom.btnInstallApp) dom.btnInstallApp.style.display = 'inline-flex';
    });

    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      if (dom.btnInstallApp) dom.btnInstallApp.style.display = 'none';
      showToast(t('toast_app_installed'), 'success');
    });

    const ua = navigator.userAgent || '';
    state.isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (state.isIOS && !isStandalone && dom.btnInstallApp) {
      dom.btnInstallApp.style.display = 'inline-flex';
    }

    if (dom.btnInstallApp) {
      dom.btnInstallApp.addEventListener('click', () => {
        if (state.deferredInstallPrompt) {
          state.deferredInstallPrompt.prompt();
          state.deferredInstallPrompt.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') dom.btnInstallApp.style.display = 'none';
            state.deferredInstallPrompt = null;
          });
        } else if (state.isIOS && dom.iosInstallModal) {
          dom.iosInstallModal.style.display = 'flex';
        }
      });
    }

    if (dom.btnCloseIosInstall) {
      dom.btnCloseIosInstall.addEventListener('click', () => { dom.iosInstallModal.style.display = 'none'; });
    }
    if (dom.btnGotItIos) {
      dom.btnGotItIos.addEventListener('click', () => { dom.iosInstallModal.style.display = 'none'; });
    }
  }

  function detectDevice() {
    const ua = navigator.userAgent || '';
    let nameKey = 'device_browser';
    let icon = '💻';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isMac = /Macintosh/.test(ua) && !isIOS;
    const isWindows = /Windows/.test(ua);

    if (isIOS) {
      nameKey = 'device_iphone';
      icon = '📱';
      state.detectedDeviceLabel = 'iPhone / iPad';
      if (dom.iosNotice) dom.iosNotice.style.display = 'flex';
    } else if (isAndroid) {
      nameKey = 'device_android';
      icon = '📱';
      state.detectedDeviceLabel = 'Android';
    } else if (isMac) {
      nameKey = 'device_mac';
      icon = '💻';
      state.detectedDeviceLabel = 'Mac';
    } else if (isWindows) {
      nameKey = 'device_windows';
      icon = '💻';
      state.detectedDeviceLabel = 'Windows PC';
    } else {
      state.detectedDeviceLabel = 'Device';
    }

    if (dom.deviceName) dom.deviceName.textContent = t(nameKey);
    if (dom.deviceBadge) {
      const iconEl = dom.deviceBadge.querySelector('.device-icon');
      if (iconEl) iconEl.textContent = icon;
    }
  }

  async function initWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        state.wakeLockSentinel = await navigator.wakeLock.request('screen');
        if (dom.wakeLockText) dom.wakeLockText.textContent = t('wakelock_active');
        if (dom.wakeLockStatus) dom.wakeLockStatus.classList.add('active');
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            try {
              state.wakeLockSentinel = await navigator.wakeLock.request('screen');
            } catch (e) {}
          }
        });
      } catch (err) {
        fallbackWakeLock();
      }
    } else {
      fallbackWakeLock();
    }
  }

  function fallbackWakeLock() {
    try {
      if (dom.keepAwakeVideo) {
        dom.keepAwakeVideo.src = 'data:video/mp4;base64,AAAAHGZ0eXBpc29tAAAAAGlzb21tcDQxAAAACHZpZGVvAAAAAA==';
        dom.keepAwakeVideo.play().catch(() => {});
      }
    } catch (e) {}
  }

  /* ==============================================================
   * 6. 事件绑定
   * ============================================================== */
  function bindEvents() {
    document.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById('tab-' + btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    if (dom.btnWallpaperCycle) {
      dom.btnWallpaperCycle.addEventListener('click', () => {
        state.wallpaperIdx = (state.wallpaperIdx + 1) % WALLPAPER_PRESETS.length;
        localStorage.setItem('satafat_wp_idx', String(state.wallpaperIdx));
        const wp = WALLPAPER_PRESETS[state.wallpaperIdx];
        document.documentElement.setAttribute('data-wallpaper', wp.id);
        showToast(t('toast_wallpaper_changed', { name: wp.name }), 'info');
      });
    }

    if (dom.btnThemeToggle) {
      dom.btnThemeToggle.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    if (dom.btnRunSpeedTest) {
      dom.btnRunSpeedTest.addEventListener('click', () => runSpeedTest(false));
    }

    if (dom.btnSelectFiles) {
      dom.btnSelectFiles.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.fileInput.click();
      });
    }
    if (dom.btnSelectFolder) {
      dom.btnSelectFolder.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.folderInput.click();
      });
    }
    if (dom.dropZone) {
      dom.dropZone.addEventListener('click', () => dom.fileInput.click());

      ['dragenter', 'dragover'].forEach(ev => {
        dom.dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dom.dropZone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(ev => {
        dom.dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dom.dropZone.classList.remove('dragover');
        });
      });

      dom.dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }

    if (dom.fileInput) {
      dom.fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        dom.fileInput.value = '';
      });
    }
    if (dom.folderInput) {
      dom.folderInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        dom.folderInput.value = '';
      });
    }

    if (dom.searchFilesInput) {
      dom.searchFilesInput.addEventListener('input', renderFilesTable);
    }
    if (dom.btnRefreshFiles) {
      dom.btnRefreshFiles.addEventListener('click', loadFiles);
    }

    if (dom.btnOpenQr) dom.btnOpenQr.addEventListener('click', openQrModal);
    if (dom.btnQuickQr) dom.btnQuickQr.addEventListener('click', openQrModal);
    if (dom.btnCloseQr) dom.btnCloseQr.addEventListener('click', () => { dom.qrModal.style.display = 'none'; });
    if (dom.qrModal) {
      dom.qrModal.addEventListener('click', (e) => {
        if (e.target === dom.qrModal) dom.qrModal.style.display = 'none';
      });
    }
    if (dom.ipSelect) {
      dom.ipSelect.addEventListener('change', (e) => {
        updateQrCode(e.target.value);
        renderMultiIpPills(e.target.value);
      });
    }
    if (dom.btnCopyUrl) {
      dom.btnCopyUrl.addEventListener('click', () => {
        copyToClipboard(dom.directUrlInput.value, t('toast_copied_url'));
      });
    }
    if (dom.btnCopyAccessUrl) {
      dom.btnCopyAccessUrl.addEventListener('click', () => {
        copyToClipboard(dom.accessUrlText.textContent, t('toast_access_url_copied'));
      });
    }
    if (dom.accessUrlPill) {
      dom.accessUrlPill.addEventListener('click', () => {
        copyToClipboard(dom.accessUrlText.textContent, t('toast_access_url_copied'));
      });
    }

    if (dom.btnOpenChangeDir) dom.btnOpenChangeDir.addEventListener('click', openStorageModal);
    if (dom.storagePathDisplay) dom.storagePathDisplay.addEventListener('click', openStorageModal);
    if (dom.btnCloseStorageModal) dom.btnCloseStorageModal.addEventListener('click', closeStorageModal);
    if (dom.btnCancelStorage) dom.btnCancelStorage.addEventListener('click', closeStorageModal);
    if (dom.btnSaveStorage) dom.btnSaveStorage.addEventListener('click', saveStorageDir);
    if (dom.storageModal) {
      dom.storageModal.addEventListener('click', (e) => {
        if (e.target === dom.storageModal) closeStorageModal();
      });
    }

    if (dom.btnSendClipboard) dom.btnSendClipboard.addEventListener('click', sendClipboard);
    if (dom.btnCopyClipboard) {
      dom.btnCopyClipboard.addEventListener('click', () => {
        copyToClipboard(dom.clipboardInput.value, t('toast_copied_text'));
      });
    }
  }

  /* ==============================================================
   * 7. 接收端存储位置与服务器网络信息
   * ============================================================== */
  async function fetchStorageConfig() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      state.storageConfig = await res.json();
      updateStorageDisplay();
    } catch (e) {}
  }

  function updateStorageDisplay() {
    if (!state.storageConfig) return;
    const dir = state.storageConfig.storageDir || '--';
    if (dom.storagePathDisplay) {
      dom.storagePathDisplay.textContent = dir;
      dom.storagePathDisplay.title = dir;
    }
    if (dom.storageFreeBadge) {
      if (state.storageConfig.freeSpace && state.storageConfig.freeSpace !== '--') {
        dom.storageFreeBadge.textContent = t('storage_free_badge', {
          free: state.storageConfig.freeSpace,
          total: state.storageConfig.totalSpace || '--'
        });
        dom.storageFreeBadge.style.display = 'inline-flex';
      } else {
        dom.storageFreeBadge.style.display = 'none';
      }
    }
  }

  function openStorageModal() {
    if (!dom.storageModal) return;
    if (state.storageConfig) {
      dom.customStorageInput.value = state.storageConfig.storageDir || '';
      renderQuickDrives();
    }
    dom.storageModal.style.display = 'flex';
  }

  function closeStorageModal() {
    if (dom.storageModal) dom.storageModal.style.display = 'none';
  }

  function renderQuickDrives() {
    if (!dom.quickDrivesContainer) return;
    dom.quickDrivesContainer.innerHTML = '';
    const drives = (state.storageConfig && state.storageConfig.drives) || [];
    drives.forEach(drive => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drive-card-btn';
      btn.innerHTML = `<div>💾 <strong>${escapeHtml(drive.label || drive.name)}</strong></div>`;
      btn.addEventListener('click', () => {
        dom.customStorageInput.value = drive.path || (drive.name + 'LAN_Share');
        dom.quickDrivesContainer.querySelectorAll('.drive-card-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      dom.quickDrivesContainer.appendChild(btn);
    });
  }

  async function saveStorageDir() {
    const newDir = dom.customStorageInput.value.trim();
    if (!newDir) return;
    dom.btnSaveStorage.disabled = true;
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageDir: newDir })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed');
      showToast(t('toast_storage_updated', { dir: data.storageDir }), 'success');
      closeStorageModal();
      await fetchStorageConfig();
      await fetchServerInfo();
      loadFiles();
    } catch (err) {
      showToast(t('toast_storage_error', { err: err.message }), 'error');
    } finally {
      dom.btnSaveStorage.disabled = false;
    }
  }

  async function fetchServerInfo() {
    try {
      const res = await fetch('/api/info');
      if (!res.ok) return;
      const data = await res.json();
      state.serverInfo = data;
      state.activeIps = data.ips || [window.location.hostname];

      updateServerInfoBadge();

      if (dom.ipSelect) {
        dom.ipSelect.innerHTML = '';
        state.activeIps.forEach(ip => {
          const opt = document.createElement('option');
          opt.value = ip;
          opt.textContent = ip;
          dom.ipSelect.appendChild(opt);
        });
      }

      const lanIp = state.activeIps.find(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) || state.activeIps[0];
      if (dom.ipSelect) dom.ipSelect.value = lanIp;
      updateQrCode(lanIp);
      renderMultiIpPills(lanIp);
    } catch (e) {}
  }

  function renderMultiIpPills(activeIp) {
    if (!dom.otherIpsContainer || !dom.multiIpNotice) return;
    if (!state.activeIps || state.activeIps.length <= 1) {
      dom.multiIpNotice.style.display = 'none';
      return;
    }
    dom.multiIpNotice.style.display = 'flex';
    dom.otherIpsContainer.innerHTML = '';
    state.activeIps.forEach(ip => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ip-alt-pill' + (ip === activeIp ? ' active' : '');
      btn.textContent = ip;
      btn.addEventListener('click', () => {
        if (dom.ipSelect) dom.ipSelect.value = ip;
        updateQrCode(ip);
        renderMultiIpPills(ip);
      });
      dom.otherIpsContainer.appendChild(btn);
    });
  }

  function updateServerInfoBadge() {
    if (!dom.serverInfoBadge) return;
    if (state.serverInfo) {
      dom.serverInfoBadge.textContent = t('server_info_badge', {
        port: state.serverInfo.port || window.location.port || '5200',
        dir: state.serverInfo.uploadDir || 'LAN_Share'
      });
    } else {
      dom.serverInfoBadge.textContent = t('server_ready');
    }
  }

  function openQrModal() {
    if (!dom.qrModal) return;
    dom.qrModal.style.display = 'flex';
    if (!state.currentIp && state.activeIps.length > 0) {
      updateQrCode(dom.ipSelect.value || state.activeIps[0]);
    }
  }

  function updateQrCode(ip) {
    state.currentIp = ip;
    const port = window.location.port || (state.serverInfo ? state.serverInfo.port : '5200');
    const cleanUrl = `http://${ip}:${port}`;
    const scanUrl = `${cleanUrl}/?scan=1`;

    if (dom.directUrlInput) dom.directUrlInput.value = cleanUrl;
    if (dom.accessUrlText) dom.accessUrlText.textContent = cleanUrl;

    if (!dom.qrcodeContainer) return;
    dom.qrcodeContainer.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      qrcodeInstance = new QRCode(dom.qrcodeContainer, {
        text: scanUrl,
        width: 196,
        height: 196,
        colorDark: '#060b19',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  }

  /* ==============================================================
   * 8. 100GB+ 大文件流式分片上传引擎
   * ============================================================== */
  function handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.startsWith('._') || file.name === '.DS_Store') continue;
      state.uploadQueue.push({
        id: 'up_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now(),
        file: file,
        name: file.name,
        size: file.size,
        fileId: generateFileFingerprint(file),
        totalChunks: Math.ceil(file.size / CHUNK_SIZE) || 1,
        uploadedChunks: new Set(),
        uploadedBytes: 0,
        speed: 0,
        status: 'pending',
        errorMsg: '',
        startTime: 0,
        lastBytes: 0,
        lastTime: 0
      });
    }
    renderLiveMonitor();
    processQueue();
  }

  function generateFileFingerprint(file) {
    const raw = `${file.name}_${file.size}_${file.lastModified}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'f_' + Math.abs(hash).toString(36) + '_' + file.size;
  }

  async function processQueue() {
    if (state.uploadQueue.some(t => t.status === 'uploading')) return;
    const nextTask = state.uploadQueue.find(t => t.status === 'pending');
    if (!nextTask) return;
    await uploadTask(nextTask);
    processQueue();
  }

  async function uploadTask(task) {
    task.status = 'uploading';
    task.startTime = Date.now();
    task.lastTime = Date.now();
    task.lastBytes = 0;
    renderLiveMonitor();

    try {
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: task.fileId,
          fileName: task.name,
          fileSize: task.size,
          chunkSize: CHUNK_SIZE,
          totalChunks: task.totalChunks
        })
      });
      if (!initRes.ok) throw new Error('Init upload failed');
      const initData = await initRes.json();

      if (initData.receivedChunks && Array.isArray(initData.receivedChunks)) {
        initData.receivedChunks.forEach(idx => task.uploadedChunks.add(idx));
      }

      task.uploadedBytes = Math.min(task.size, task.uploadedChunks.size * CHUNK_SIZE);
      if (task.uploadedChunks.size >= task.totalChunks) {
        await finishUpload(task);
        return;
      }

      const pendingIndices = [];
      for (let i = 0; i < task.totalChunks; i++) {
        if (!task.uploadedChunks.has(i)) pendingIndices.push(i);
      }

      let currentIndex = 0;
      const worker = async () => {
        while (currentIndex < pendingIndices.length && task.status === 'uploading') {
          const chunkIdx = pendingIndices[currentIndex++];
          const start = chunkIdx * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, task.size);
          const chunkBlob = task.file.slice(start, end);
          await uploadSingleChunk(task, chunkIdx, start, chunkBlob);
          task.uploadedChunks.add(chunkIdx);
          task.uploadedBytes += chunkBlob.size;
          updateTaskProgress(task);
        }
      };

      const workers = [];
      for (let w = 0; w < Math.min(CONCURRENCY, pendingIndices.length); w++) {
        workers.push(worker());
      }
      await Promise.all(workers);

      if (task.status === 'uploading') {
        await finishUpload(task);
      }
    } catch (err) {
      task.status = 'error';
      task.errorMsg = err.message || 'Interrupted';
      showToast(t('toast_upload_error', { name: task.name, err: task.errorMsg }), 'error');
      renderLiveMonitor();
    }
  }

  async function uploadSingleChunk(task, chunkIdx, offset, chunkBlob) {
    const url = `/api/upload/chunk?fileId=${encodeURIComponent(task.fileId)}&chunkIndex=${chunkIdx}&offset=${offset}&totalChunks=${task.totalChunks}`;
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, { method: 'POST', body: chunkBlob });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < 3) await new Promise(r => setTimeout(r, 600 * attempt));
      }
    }
    throw new Error(lastErr ? lastErr.message : 'Chunk failed');
  }

  async function finishUpload(task) {
    const res = await fetch('/api/upload/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: task.fileId,
        fileName: task.name,
        fileSize: task.size
      })
    });
    if (!res.ok) throw new Error('Finish upload failed');
    task.status = 'completed';
    task.uploadedBytes = task.size;
    showToast(t('toast_upload_success', { name: task.name }), 'success');
    renderLiveMonitor();
    loadFiles();
  }

  function updateTaskProgress(task) {
    const now = Date.now();
    const dt = (now - task.lastTime) / 1000;
    if (dt >= 0.4) {
      task.speed = Math.max(0, (task.uploadedBytes - task.lastBytes) / dt);
      task.lastBytes = task.uploadedBytes;
      task.lastTime = now;
      pushWaveSample(task.speed / (1024 * 1024));
      renderLiveMonitor();
    }
  }

  /* ==============================================================
   * 9. 共享空间文件列表与操作
   * ============================================================== */
  async function loadFiles() {
    try {
      const res = await fetch('/api/files');
      if (!res.ok) return;
      const data = await res.json();
      state.files = Array.isArray(data) ? data : (data.files || []);
      renderFilesTable();
    } catch (e) {}
  }

  function renderFilesTable() {
    if (!dom.filesTableBody) return;
    const kw = (dom.searchFilesInput ? dom.searchFilesInput.value : '').trim().toLowerCase();
    const filtered = state.files.filter(f => !kw || f.name.toLowerCase().includes(kw));

    const unit = state.currentLang === 'zh' ? '个文件' : (state.currentLang === 'tr' ? 'dosya' : 'files');
    if (dom.fileCountBadge) dom.fileCountBadge.textContent = `${state.files.length} ${unit}`;

    if (filtered.length === 0) {
      dom.filesTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">
            <div class="empty-vault-state">
              <div class="empty-glass-orb">💧</div>
              <p>${kw ? t('empty_search') : t('empty_files')}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    dom.filesTableBody.innerHTML = '';
    filtered.forEach(file => {
      const tr = document.createElement('tr');
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const icon = getFileIcon(ext);
      const downloadUrl = `/download/${encodeURIComponent(file.name)}`;

      tr.innerHTML = `
        <td>
          <div class="file-cell-main">
            <div class="file-ext-orb">${icon}</div>
            <a href="${downloadUrl}" download="${escapeHtml(file.name)}" class="file-title-link" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</a>
          </div>
        </td>
        <td>${formatBytes(file.size)}</td>
        <td>${formatDate(file.modified)}</td>
        <td>
          <div class="file-actions-cell">
            <a href="${downloadUrl}" download="${escapeHtml(file.name)}" class="glass-btn btn-primary-glow btn-sm">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              <span>${t('btn_download')}</span>
            </a>
            <button type="button" class="glass-btn btn-sm btn-copy-link" data-url="${window.location.origin}${downloadUrl}">
              ${t('btn_copy_link')}
            </button>
            <button type="button" class="glass-btn btn-danger-glass btn-sm btn-delete-file" data-name="${escapeHtml(file.name)}">
              ${t('btn_delete')}
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-copy-link').addEventListener('click', (e) => {
        copyToClipboard(e.currentTarget.dataset.url, t('toast_copied_link'));
      });
      tr.querySelector('.btn-delete-file').addEventListener('click', async (e) => {
        const name = e.currentTarget.dataset.name;
        if (confirm(t('toast_delete_confirm', { name }))) {
          await deleteFile(name);
        }
      });

      dom.filesTableBody.appendChild(tr);
    });
  }

  async function deleteFile(fileName) {
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fileName })
      });
      if (res.ok) {
        showToast(t('toast_deleted', { name: fileName }), 'info');
        loadFiles();
      } else {
        showToast(t('toast_delete_error'), 'error');
      }
    } catch (e) {
      showToast(t('toast_delete_error'), 'error');
    }
  }

  /* ==============================================================
   * 10. 剪贴板同步与工具函数
   * ============================================================== */
  async function loadClipboard() {
    try {
      const res = await fetch('/api/clipboard');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.text !== undefined && data.text !== dom.clipboardInput.value) {
        if (document.activeElement !== dom.clipboardInput) {
          dom.clipboardInput.value = data.text;
          if (data.updated) {
            dom.clipboardTime.textContent = t('clipboard_last_updated', { time: formatDate(data.updated) });
          }
        }
      }
    } catch (e) {}
  }

  async function sendClipboard() {
    try {
      const res = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: dom.clipboardInput.value })
      });
      if (res.ok) {
        showToast(t('toast_clipboard_sent'), 'success');
        dom.clipboardTime.textContent = t('clipboard_just_now');
      }
    } catch (e) {
      showToast(t('toast_clipboard_error'), 'error');
    }
  }

  function copyToClipboard(text, tip) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(tip || t('toast_copied_url'), 'success');
      }).catch(() => fallbackCopy(text, tip));
    } else {
      fallbackCopy(text, tip);
    }
  }

  function fallbackCopy(text, tip) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(tip || t('toast_copied_url'), 'success');
    } catch (e) {
      showToast(t('toast_copy_fallback_error'), 'error');
    }
    document.body.removeChild(ta);
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatSpeed(bps) {
    if (!bps || bps <= 0) return '0.0 MB/s';
    if (bps >= 1024 * 1024) {
      return (bps / (1024 * 1024)).toFixed(1) + ' MB/s';
    }
    return (bps / 1024).toFixed(0) + ' KB/s';
  }

  function formatTime(sec) {
    const uSec = t('unit_seconds');
    const uMin = t('unit_minutes');
    const uHour = t('unit_hours');
    if (sec < 60) return `${sec}${uSec}`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m < 60) return `${m}${uMin}${s}${uSec}`;
    const h = Math.floor(m / 60);
    return `${h}${uHour}${m % 60}${uMin}`;
  }

  function formatDate(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const pad = n => (n < 10 ? '0' + n : n);
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function getFileIcon(ext) {
    if (['mp4', 'mov', 'mkv', 'avi', 'wmv', 'flv', 'webm', 'm4v'].includes(ext)) return '🎬';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'svg'].includes(ext)) return '🖼️';
    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return '🎵';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'dmg'].includes(ext)) return '📦';
    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md'].includes(ext)) return '📑';
    if (['exe', 'apk', 'ipa', 'msi', 'deb'].includes(ext)) return '⚙️';
    return '📄';
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function showToast(msg, type = 'info') {
    if (!dom.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `liquid-toast toast-${type}`;
    toast.textContent = msg;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.28s ease';
      setTimeout(() => toast.remove(), 280);
    }, 3200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
