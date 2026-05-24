export const HTML_CODE = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PoseAlertGameon - Hệ thống Giám sát Tư thế ngồi</title>
    <!-- Tailwind CSS và Lucide Icons -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- TensorFlow.js và Teachable Machine Pose CDN -->
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col">

    <!-- Header -->
    <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div class="flex items-center gap-3">
            <div class="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
                <i data-lucide="activity" class="w-6 h-6 animate-pulse"></i>
            </div>
            <div>
                <h1 class="font-display text-xl font-bold tracking-tight text-white">PoseAlertGameon</h1>
                <p class="text-xs text-slate-400">Hệ thống AIoT Giám sát Tư thế ngồi thời gian thực</p>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <div id="connection-status" class="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/20">
                <span class="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                <span>Hệ thống Hoạt động</span>
            </div>
        </div>
    </header>

    <!-- Main Container Layout -->
    <main class="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Cột TRÁI: Camera AIoT & Trạng thái phân loại -->
        <div class="lg:col-span-7 flex flex-col gap-6">
            
            <!-- Ô View Camera AI -->
            <div id="camera-card" class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 relative">
                <div class="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div class="flex items-center gap-2">
                        <i data-lucide="video" class="w-5 h-5 text-indigo-400"></i>
                        <h2 class="font-semibold text-white">Camera Giám sát AI</h2>
                    </div>
                    <!-- Trạng thái kết nối Model -->
                    <span id="ai-status" class="text-xs text-slate-400 flex items-center gap-1">
                        <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin hidden"></i>
                        <span id="ai-status-text">Chưa khởi chạy</span>
                    </span>
                </div>

                <div class="p-4 flex flex-col items-center justify-center bg-slate-950 min-h-[300px] relative">
                    <!-- Overlay cảnh báo nhấp nháy lớn -->
                    <div id="danger-overlay" class="absolute inset-0 bg-red-600/20 pointer-events-none hidden flex-col items-center justify-center border-4 border-red-500 z-10 animate-pulse">
                        <div class="bg-red-600 text-white font-bold text-center px-6 py-3 rounded-lg shadow-xl uppercase tracking-wider text-sm md:text-base flex items-center gap-2">
                            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                            CẢNH BÁO: BẠN ĐANG NGỒI SAI TƯ THẾ!
                        </div>
                    </div>

                    <!-- Vị trí vẽ Camera/Skeleton -->
                    <div class="w-full max-w-md bg-slate-900 aspect-video rounded-xl relative overflow-hidden border border-slate-800 flex items-center justify-center">
                        <canvas id="canvas" class="w-full h-full object-cover transform scale-x-[-1]"></canvas>
                        <div id="webcam-placeholder" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/90 gap-3">
                            <i data-lucide="camera" class="w-12 h-12 text-slate-600"></i>
                            <p class="text-sm">Click nút <strong>Khởi động Camera</strong> phía dưới để bắt đầu giám sát AI</p>
                        </div>
                    </div>

                    <!-- Thanh đếm giây giữ tư thế xấu -->
                    <div class="w-full max-w-md mt-4 bg-slate-900 rounded-lg p-3 border border-slate-850">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-slate-400">Thời gian sai tư thế liên tục:</span>
                            <span id="bad-timer-text" class="text-rose-400 font-bold">0.0s / 5.0s</span>
                        </div>
                        <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                            <div id="bad-timer-bar" class="bg-rose-500 h-full w-0 transition-all duration-200"></div>
                        </div>
                    </div>
                </div>

                <!-- Điều khiển Camera -->
                <div class="p-4 bg-slate-900/60 border-t border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div class="w-full flex-grow">
                        <label class="block text-xs font-medium text-slate-400 mb-1">Đường dẫn Teachable Machine Model URL:</label>
                        <input id="model-url-path" type="text" value="https://teachablemachine.withgoogle.com/models/H2kS8RPl8/" class="w-full bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500">
                    </div>
                    <button id="btn-start-camera" class="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-all transform active:scale-95">
                        <i data-lucide="play" class="w-4 h-4"></i>
                        <span>Khởi động Camera AI</span>
                    </button>
                </div>
            </div>

            <!-- Kết quả phân loại thời gian thực -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                    <i data-lucide="activity" class="w-4 h-4 text-emerald-400"></i>
                    Kết quả Phân loại AI Real-time
                </h3>

                <!-- Tư thế chính đang nhận diện -->
                <div id="current-pose-container" class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                    <div id="current-pose-icon" class="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mt-0.5">
                        <i data-lucide="check-circle" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="text-xs text-slate-400 uppercase font-semibold">Tư thế hiện tại</div>
                        <h4 id="current-pose-title" class="text-lg font-bold text-white">Ngồi đúng tư thế</h4>
                        <p id="current-pose-desc" class="text-xs text-slate-300 mt-1">Tư thế hoàn hảo! Cột sống thẳng, mắt nhìn ngang tầm màn hình.</p>
                    </div>
                </div>

                <!-- Chi tiết xác suất % của các class -->
                <div id="probability-list" class="flex flex-col gap-3">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-emerald-400 font-medium">Ngồi đúng tư thế (Dung_Tu_The)</span>
                            <span id="prob-Dung_Tu_The" class="font-mono text-slate-400 font-bold">100%</span>
                        </div>
                        <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div id="bar-Dung_Tu_The" class="bg-emerald-500 h-full w-[100%] transition-all duration-300"></div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-400">Cúi đầu / Gù lưng (Cui_Dau)</span>
                            <span id="prob-Cui_Dau" class="font-mono text-slate-400 font-bold">0%</span>
                        </div>
                        <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div id="bar-Cui_Dau" class="bg-rose-500/50 h-full w-0 transition-all duration-300"></div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-400">Nghiêng người / Lệch vai (Veo_Lung)</span>
                            <span id="prob-Veo_Lung" class="font-mono text-slate-400 font-bold">0%</span>
                        </div>
                        <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div id="bar-Veo_Lung" class="bg-amber-500/50 h-full w-0 transition-all duration-300"></div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-slate-400">Ngồi quá sát màn hình (Mat_Qua_Gan)</span>
                            <span id="prob-Mat_Qua_Gan" class="font-mono text-slate-400 font-bold">0%</span>
                        </div>
                        <div class="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                            <div id="bar-Mat_Qua_Gan" class="bg-orange-500/50 h-full w-0 transition-all duration-300"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cột PHẢI: Pomodoro & Thống kê & Hướng dẫn -->
        <div class="lg:col-span-5 flex flex-col gap-6">
            
            <!-- Bộ đếm Pomodoro -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <!-- Nút bật/tắt chuông -->
                <button id="btn-toggle-sound" class="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg hover:text-white transition-all">
                    <i data-lucide="volume-2" class="w-4 h-4"></i>
                </button>

                <h3 class="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                    <i data-lucide="clock" class="w-4 h-4 text-violet-400"></i>
                    Đồng hồ Tập trung Pomodoro
                </h3>

                <div class="flex flex-col items-center py-4 bg-slate-950/40 rounded-xl border border-slate-850">
                    <span id="pomo-mode-badge" class="px-3 py-1 bg-violet-600/15 text-violet-400 border border-violet-500/20 text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
                        Thời gian tập chung
                    </span>
                    <span id="pomo-timer" class="font-display text-5xl md:text-6xl font-extrabold text-white tracking-widest mb-4">
                        25:00
                    </span>
                    
                    <!-- Nút bấm điều khiển -->
                    <div class="flex gap-3">
                        <button id="pomo-btn-play" class="p-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-xs font-semibold px-4">
                            <i data-lucide="play" class="w-4 h-4"></i> Bắt đầu
                        </button>
                        <button id="pomo-btn-pause" class="p-3 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-xs font-semibold px-4">
                            <i data-lucide="pause" class="w-4 h-4"></i> Tạm dừng
                        </button>
                        <button id="pomo-btn-reset" class="p-3 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-xl transition-all border border-slate-800 flex items-center justify-center">
                            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <!-- Cấu hình thời gian -->
                <div class="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800 text-center">
                    <div>
                        <span class="block text-xs text-slate-400 mb-1">Thời gian học (phút)</span>
                        <input id="pomo-focus-len" type="number" value="25" min="1" max="60" class="w-full bg-slate-950 border border-slate-850 px-3 py-1 text-center font-bold text-white rounded-lg focus:outline-none focus:border-violet-500 text-sm">
                    </div>
                    <div>
                        <span class="block text-xs text-slate-400 mb-1">Thời gian nghỉ (phút)</span>
                        <input id="pomo-break-len" type="number" value="5" min="1" max="30" class="w-full bg-slate-950 border border-slate-850 px-3 py-1 text-center font-bold text-white rounded-lg focus:outline-none focus:border-violet-500 text-sm">
                    </div>
                </div>
            </div>

            <!-- Bảng thống kê trạng thái -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
                <h3 class="font-semibold text-white flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                    <i data-lucide="trending-up" class="w-4 h-4 text-emerald-400"></i>
                    Bảng Thống kê Sức khỏe Ngồi
                </h3>

                <!-- Tóm tắt chỉ số -->
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center">
                        <span class="block text-[10px] text-slate-400 font-medium">Tỉ lệ ngồi thẳng</span>
                        <span id="stat-good-ratio" class="font-display text-lg font-bold text-emerald-400">100%</span>
                    </div>
                    <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center">
                        <span class="block text-[10px] text-slate-400 font-medium">Số lỗi vi phạm</span>
                        <span id="stat-total-violations" class="font-display text-lg font-bold text-rose-400">0</span>
                    </div>
                    <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center">
                        <span class="block text-[10px] text-slate-400 font-medium">Chu kỳ Pomodoro</span>
                        <span id="stat-pomo-cycles" class="font-display text-lg font-bold text-violet-400">0</span>
                    </div>
                </div>

                <!-- Log lịch sử vi phạm mới nhất -->
                <div class="mt-2">
                    <span class="block text-xs font-semibold text-slate-400 mb-2 uppercase">Lịch sử vi phạm mới nhất</span>
                    <div id="logs-container" class="max-h-[140px] overflow-y-auto flex flex-col gap-2 rounded-xl bg-slate-950 p-3 border border-slate-850 scrollbar-thin">
                        <div id="no-log-msg" class="text-xs text-slate-500 text-center py-4">Chưa có vi phạm nào. Bạn đang có tư thế rất tốt!</div>
                    </div>
                </div>
            </div>

            <!-- Hướng dẫn sử dụng học máy Pose -->
            <div class="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-start gap-3 text-xs text-slate-400">
                <i data-lucide="info" class="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5"></i>
                <div class="space-y-1">
                    <span class="font-bold text-slate-300 block">Hướng dẫn huấn luyện thêm:</span>
                    <p>Hệ thống hỗ trợ tích hợp trực quan mô hình được tạo từ <a href="https://teachablemachine.withgoogle.com/train/pose" target="_blank" class="text-indigo-400 underline">Teachable Machine (Pose Project)</a>.</p>
                    <p>Định dạng dữ liệu gồm 4 Class khớp chữ: <code class="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-indigo-300">Dung_Tu_The</code>, <code class="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-indigo-300">Cui_Dau</code>, <code class="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-indigo-300">Veo_Lung</code>, <code class="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-indigo-300">Mat_Qua_Gan</code>.</p>
                </div>
            </div>
        </div>
    </main>

    <script src="script.js"></script>
    <script>
        // Khởi động các Icons củ Lucide sau khi tải xong trang
        lucide.createIcons();
    </script>
</body>
</html>`;

export const CSS_CODE = `/* File Style cho PoseAlertGameon - Lưu tên style.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');

/* Font chữ mặc định */
:root {
  --font-sans: 'Inter', sans-serif;
  --font-display: 'Space Grotesk', sans-serif;
}

body {
  font-family: var(--font-sans);
}

.font-display {
  font-family: var(--font-display);
}

/* Hiệu ứng nhấp nháy chuyển màu camera khi sai tư thế */
@keyframes borderAlert {
  0%, 100% {
    border-color: #ef4444; /* Màu đỏ */
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
  }
  50% {
    border-color: rgba(239,68,68, 0.3);
    box-shadow: 0 0 2px rgba(239, 68, 68, 0.1);
  }
}

.warning-active {
  animation: borderAlert 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
}

/* Thù hình scroll bar tinh gọn */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #475569;
}`;

export const JS_CODE = `/**
 * MÃ NGUỒN JAVASCRIPT ĐIỀU KHIỂN CHÍNH
 * Lưu tên: script.js
 */

// 1. CẤU HÌNH HẰNG SỐ
// Thay đổi Link Teachable Machine Model của bạn đã train tại đây để kết nối thực tế!
const URL = "https://teachablemachine.withgoogle.com/models/H2kS8RPl8/"; 
const WARNING_DELAY = 5000; // Thời gian tối đa (5 giây) liên tục sai tư thế để kích hoạt cảnh báo

// Các Class phải khớp chính xác tuyệt đối để hệ thống xử lý logic cảnh báo
const CLASS_LABELS = {
    "Dung_Tu_The": "Ngồi đúng tư thế",
    "Cui_Dau": "Cúi đầu / Gù lưng",
    "Veo_Lung": "Nghiêng người / Lệch vai",
    "Mat_Qua_Gan": "Ngồi quá sát màn hình"
};

const CLASS_DESCRIPTIONS = {
    "Dung_Tu_The": "Tư thế hoàn hảo! Cột sống thẳng, mắt nhìn ngang tầm màn hình.",
    "Cui_Dau": "Cảnh báo: Bạn đang cúi thấp đầu hoặc gù lưng. Dễ mỏi cổ và hại cột sống.",
    "Veo_Lung": "Cảnh báo: Người bị lệch sang một bên, vai bất cân xứng. Nguy cơ vẹo cột sống.",
    "Mat_Qua_Gan": "Cảnh báo: Khoảng cách từ mắt tới màn hình quá gần. Dễ gây cận thị và mỏi mắt."
};

// 2. BIẾN TOÀN CỤC CHƯƠNG TRÌNH
let model, webcam, ctx, maxPredictions;
let isCameraRunning = false;
let isSoundOn = true;

// Trạng thái tư thế
let currentActivePose = "Dung_Tu_The";
let badPostureTimer = 0; // đơn vị ms tích lũy
const checkInterval = 200; // kiểm tra mỗi 200ms
let intervalLogic = null;
let isWarningActive = false;

// Trạng thái Pomodoro
let pomodoroMode = "focus"; // focus hoặc break
let focusMinutes = 25;
let breakMinutes = 5;
let timerRemaining = 25 * 60; // Số giây còn lại
let isTimerRunning = false;
let timerInterval = null;
let completedPomodoros = 0;

// Trạng thái thống kê sức khỏe ngồi
let totalMonitorSeconds = 0;
let stableStraightSeconds = 0;
let totalViolationCount = 0;

// Audio alerts
let audioCtx = null;
let alarmBeepInterval = null;

// DOM Elements
const btnStartCamera = document.getElementById("btn-start-camera");
const modelUrlPathInput = document.getElementById("model-url-path");
const aiStatusText = document.getElementById("ai-status-text");
const canvas = document.getElementById("canvas");
const webcamPlaceholder = document.getElementById("webcam-placeholder");
const dangerOverlay = document.getElementById("danger-overlay");
const badTimerText = document.getElementById("bad-timer-text");
const badTimerBar = document.getElementById("bad-timer-bar");
const currentPoseTitle = document.getElementById("current-pose-title");
const currentPoseDesc = document.getElementById("current-pose-desc");
const currentPoseIcon = document.getElementById("current-pose-icon");
const currentPoseContainer = document.getElementById("current-pose-container");
const btnToggleSound = document.getElementById("btn-toggle-sound");

// Pomodoro Dom
const pomoTimerDisplay = document.getElementById("pomo-timer");
const pomoPlayBtn = document.getElementById("pomo-btn-play");
const pomoPauseBtn = document.getElementById("pomo-btn-pause");
const pomoResetBtn = document.getElementById("pomo-btn-reset");
const pomoFocusLenInput = document.getElementById("pomo-focus-len");
const pomoBreakLenInput = document.getElementById("pomo-break-len");
const pomoModeBadge = document.getElementById("pomo-mode-badge");

// Thống kê Dom
const statGoodRatio = document.getElementById("stat-good-ratio");
const statTotalViolations = document.getElementById("stat-total-violations");
const statPomoCycles = document.getElementById("stat-pomo-cycles");
const logsContainer = document.getElementById("logs-container");
const noLogMsg = document.getElementById("no-log-msg");

// 3. KHỞI TẠO AUDIO CONTEXT VÀ CÒI BÁO
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function startBeepAlarm() {
    if (alarmBeepInterval || !isSoundOn) return;
    initAudio();

    const playSingleBeep = () => {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz còi bíp cao độ
        
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
    };

    playSingleBeep();
    alarmBeepInterval = setInterval(playSingleBeep, 450); // Còi bíp bíp liên tục
}

function stopBeepAlarm() {
    if (alarmBeepInterval) {
        clearInterval(alarmBeepInterval);
        alarmBeepInterval = null;
    }
}

function playCompletionChime() {
    if (!isSoundOn) return;
    initAudio();
    if (!audioCtx) return;

    const playTone = (freq, delay, dur) => {
        setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + dur + 0.1);
        }, delay);
    };

    playTone(523.25, 0, 0.3); // Nốt Đô (C5)
    playTone(659.25, 200, 0.3); // Nốt Mi (E5)
    playTone(783.99, 400, 0.5); // Nốt Sol (G5)
}

// 4. KHỞI TẠO VÀ TẢI MÔ HÌNH AI TEACHABLE MACHINE
async function initAI() {
    initAudio();
    aiStatusText.innerHTML = "Đang tải mô hình...";
    const loaderIcon = document.querySelector("#ai-status i");
    if (loaderIcon) loaderIcon.classList.remove("hidden");
    
    // Đọc URL từ input thay vì hằng số cứng để linh hoạt hơn
    const activeUrl = modelUrlPathInput.value || URL;
    const modelURL = activeUrl + "model.json";
    const checkpointURL = activeUrl + "metadata.json";

    try {
        // Tải cấu trúc file mô hình của pose
        model = await tmPose.load(modelURL, checkpointURL);
        maxPredictions = model.getTotalClasses();

        // Khởi tạo camera
        const width = 480;
        const height = 360;
        const flip = true;
        webcam = new tmPose.Webcam(width, height, flip);
        await webcam.setup();
        await webcam.play();
        
        // Cấu hình Canvas
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        webcamPlaceholder.classList.add("hidden");

        isCameraRunning = true;
        aiStatusText.innerHTML = "Đang rà soát";
        if (loaderIcon) loaderIcon.classList.add("hidden");
        btnStartCamera.innerHTML = '<i data-lucide="square" class="w-4 h-4"></i>Dừng Giám Sát';
        lucide.createIcons();

        // Kích hoạt vòng lặp nhận dạng
        window.requestAnimationFrame(predictionLoop);
        
        // Kích hoạt logic đếm giây lỗi tư thế định kỳ
        startPostureLogicCheck();

    } catch (error) {
        console.error(error);
        alert("Lỗi tải Model: Đảm bảo đường dẫn Model có dạng 'https://teachablemachine.withgoogle.com/models/xxxx/' và bạn đã cấp quyền Webcam!");
        aiStatusText.innerHTML = "Lỗi khởi chạy";
        if (loaderIcon) loaderIcon.classList.add("hidden");
    }
}

// Vòng lặp lấy hình ảnh camera dự đoán liên tục
async function predictionLoop() {
    if (!isCameraRunning) return;
    
    webcam.update(); // cập nhật khung hình tiếp theo từ camera
    
    // Dự đoán pose
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const predictions = await model.predict(posenetOutput);

    let maxClass = "Dung_Tu_The";
    let maxProbability = 0;

    // Cập nhật giao diện thanh phần trưng %
    for (let i = 0; i < maxPredictions; i++) {
        const className = predictions[i].className;
        const prob = predictions[i].probability;
        const percentText = Math.round(prob * 100) + "%";
        
        // Cập nhật lên DOM
        const probLabel = document.getElementById("prob-" + className);
        const probBar = document.getElementById("bar-" + className);
        
        if (probLabel) probLabel.innerHTML = percentText;
        if (probBar) {
            probBar.style.width = (prob * 100) + "%";
            // Đổi màu thanh báo động dãn cách mờ
            if (className !== "Dung_Tu_The") {
                if (prob > 0.5) {
                    probBar.classList.add("bg-rose-500");
                } else {
                    probBar.classList.remove("bg-rose-500");
                }
            }
        }

        if (prob > maxProbability) {
            maxProbability = prob;
            maxClass = className;
        }
    }

    currentActivePose = maxClass;

    // Vẽ khớp xương lên canvas
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(webcam.canvas, 0, 0);
        if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
        }
    }

    window.requestAnimationFrame(predictionLoop);
}

// 5. THỜI GIAN KIỂM DUYỆT & PHÁT HIỆN LỖI (CHỐNG BÁO GIẢ)
function startPostureLogicCheck() {
    if (intervalLogic) clearInterval(intervalLogic);
    
    intervalLogic = setInterval(() => {
        // Tích lũy thời gian thống kê sức khỏe mỗi giây (200ms * 5 = 1s0)
        totalMonitorSeconds += (checkInterval / 1000);
        if (currentActivePose === "Dung_Tu_The") {
            stableStraightSeconds += (checkInterval / 1000);
        }

        const isBad = currentActivePose !== "Dung_Tu_The";

        if (isBad) {
            badPostureTimer += checkInterval;
            
            // Cập nhật thanh cảnh báo đỏ
            const progressPercent = Math.min((badPostureTimer / WARNING_DELAY) * 100, 100);
            badTimerBar.style.width = progressPercent + "%";
            badTimerText.innerHTML = (badPostureTimer / 1000).toFixed(1) + "s / " + (WARNING_DELAY / 1000) + "s";

            // Nếu đạt 5 giây liên tiếp sai tư thế
            if (badPostureTimer >= WARNING_DELAY) {
                if (!isWarningActive) {
                    isWarningActive = true;
                    triggerAlertOn();
                }
            }
        } else {
            // Ngồi thẳng lập tức tắt tiếng bíp
            badPostureTimer = 0;
            badTimerBar.style.width = "0%";
            badTimerText.innerHTML = "0.0s / 5.0s";
            
            if (isWarningActive) {
                isWarningActive = false;
                triggerAlertOff();
            }
        }

        // Cập nhật Panel tư thế tích cực
        updatePoseUIPanel();
        // Cập nhật thông số thống kê
        updateStatHUD();

    }, checkInterval);
}

// Bật cảnh báo lớn và còi bíp bíp
function triggerAlertOn() {
    document.getElementById("camera-card").classList.add("warning-active");
    dangerOverlay.classList.remove("hidden");
    dangerOverlay.classList.add("flex");
    totalViolationCount++;

    // Thêm log lịch sử
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');
    
    // Xóa chữ trống rỗng
    if (noLogMsg) noLogMsg.remove();
    
    const logItem = document.createElement("div");
    logItem.className = "flex justify-between items-center p-2 rounded-lg bg-red-950/40 text-rose-450 text-xs border border-red-900/20";
    
    const violationName = CLASS_LABELS[currentActivePose] || "Sai tư thế";
    logItem.innerHTML = '<span>' + violationName + '</span><span class="font-mono text-[10px]">' + timeStr + '</span>';
    
    // Cho lên đầu
    logsContainer.insertBefore(logItem, logsContainer.firstChild);

    // Bật báo động âm thanh
    startBeepAlarm();
}

// Tắt cảnh báo
function triggerAlertOff() {
    document.getElementById("camera-card").classList.remove("warning-active");
    dangerOverlay.classList.add("hidden");
    dangerOverlay.classList.remove("flex");
    stopBeepAlarm();
}

function updatePoseUIPanel() {
    const label = CLASS_LABELS[currentActivePose];
    const desc = CLASS_DESCRIPTIONS[currentActivePose];
    
    currentPoseTitle.innerHTML = label;
    currentPoseDesc.innerHTML = desc;

    if (currentActivePose === "Dung_Tu_The") {
        currentPoseContainer.className = "mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3 transition-colors duration-200";
        currentPoseIcon.className = "p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mt-0.5";
        currentPoseIcon.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5"></i>';
    } else {
        currentPoseContainer.className = "mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 transition-colors duration-200";
        currentPoseIcon.className = "p-2 bg-rose-500/20 text-rose-400 rounded-lg mt-0.5";
        currentPoseIcon.innerHTML = '<i data-lucide="alert-triangle" class="w-5 h-5"></i>';
    }
    lucide.createIcons();
}

function updateStatHUD() {
    const ratio = totalMonitorSeconds > 0 ? Math.round((stableStraightSeconds / totalMonitorSeconds) * 100) : 100;
    statGoodRatio.innerHTML = ratio + "%";
    statTotalViolations.innerHTML = totalViolationCount;
    statPomoCycles.innerHTML = completedPomodoros;
}

// 6. LOGIC ĐỒNG HỒ POMODORO
function togglePomodoro() {
    initAudio();
    if (isTimerRunning) {
        // Pause timer
        isTimerRunning = false;
        clearInterval(timerInterval);
        pomoPlayBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>Bắt đầu';
    } else {
        // Start timer
        isTimerRunning = true;
        pomoPlayBtn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i>Tạm dừng';
        
        timerInterval = setInterval(() => {
            timerRemaining--;
            if (timerRemaining <= 0) {
                playCompletionChime();
                if (pomodoroMode === "focus") {
                    pomodoroMode = "break";
                    completedPomodoros++;
                    timerRemaining = breakMinutes * 60;
                    pomoModeBadge.innerHTML = "Thời gian nghỉ ngơi";
                    pomoModeBadge.className = "px-3 py-1 bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full mb-3 uppercase tracking-wide";
                } else {
                    pomodoroMode = "focus";
                    timerRemaining = focusMinutes * 60;
                    pomoModeBadge.innerHTML = "Thời gian học tập";
                    pomoModeBadge.className = "px-3 py-1 bg-violet-600/15 text-violet-400 border border-violet-500/20 text-xs font-bold rounded-full mb-3 uppercase tracking-wide";
                }
            }
            displayTimer();
        }, 1000);
    }
    lucide.createIcons();
}

function resetPomodoro() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    pomoPlayBtn.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>Bắt đầu';
    timerRemaining = (pomodoroMode === "focus" ? focusMinutes : breakMinutes) * 60;
    displayTimer();
    lucide.createIcons();
}

function displayTimer() {
    const mins = Math.floor(timerRemaining / 60);
    const secs = timerRemaining % 60;
    pomoTimerDisplay.innerHTML = String(mins).padStart(2, '0') + ":" + String(secs).padStart(2, '0');
}

// 7. SỰ KIỆN ĐĂNG KÝ BẤT ĐỒNG BỘ
btnStartCamera.addEventListener("click", () => {
    if (!isCameraRunning) {
        initAI();
    } else {
        // Dừng camera
        isCameraRunning = false;
        stopBeepAlarm();
        if (webcam) {
            webcam.stop();
        }
        if (intervalLogic) {
            clearInterval(intervalLogic);
        }
        btnStartCamera.innerHTML = '<i data-lucide="play" class="w-4 h-4"></i>Khởi động Camera AI';
        aiStatusText.innerHTML = "Đã dừng";
        webcamPlaceholder.classList.remove("hidden");
        triggerAlertOff();
        lucide.createIcons();
    }
});

btnToggleSound.addEventListener("click", () => {
    isSoundOn = !isSoundOn;
    if (isSoundOn) {
        btnToggleSound.innerHTML = '<i data-lucide="volume-2" class="w-4 h-4 text-slate-300"></i>';
    } else {
        btnToggleSound.innerHTML = '<i data-lucide="volume-x" class="w-4 h-4 text-rose-450"></i>';
        stopBeepAlarm();
    }
    lucide.createIcons();
});

pomoPlayBtn.addEventListener("click", togglePomodoro);
pomoPauseBtn.addEventListener("click", togglePomodoro);
pomoResetBtn.addEventListener("click", resetPomodoro);

pomoFocusLenInput.addEventListener("change", (e) => {
    focusMinutes = parseInt(e.target.value) || 25;
    if (!isTimerRunning && pomodoroMode === "focus") {
        timerRemaining = focusMinutes * 60;
        displayTimer();
    }
});

pomoBreakLenInput.addEventListener("change", (e) => {
    breakMinutes = parseInt(e.target.value) || 5;
    if (!isTimerRunning && pomodoroMode === "break") {
        timerRemaining = breakMinutes * 60;
        displayTimer();
    }
});`;
