import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HTML_CODE, CSS_CODE, JS_CODE } from './code-templates';
import { 
  Camera, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Volume2, 
  VolumeX, 
  Activity, 
  Info, 
  Sparkles, 
  Copy, 
  Check, 
  FileCode, 
  Video, 
  HelpCircle,
  TrendingUp,
  RotateCw,
  Trophy
} from 'lucide-react';

// Định nghĩa các hằng số cấu hình mặc định
const DEFAULT_MODEL_URL = "https://teachablemachine.withgoogle.com/models/H2kS8RPl8/"; // Mẫu Teachable Machine link mẫu
const WARNING_DELAY = 5000; // 5 giây liên tục sai tư thế để kích hoạt cảnh báo

// Danh sách 4 tư thế và nhãn hiển thị tương ứng
const CLASS_LABELS: Record<string, string> = {
  Dung_Tu_The: "Ngồi đúng tư thế",
  Cui_Dau: "Cúi đầu / Gù lưng",
  Veo_Lung: "Nghiêng người / Lệch vai",
  Mat_Qua_Gan: "Ngồi quá sát màn hình"
};

const CLASS_DESCRIPTIONS: Record<string, string> = {
  Dung_Tu_The: "Tư thế hoàn hảo! Cột sống thẳng, mắt nhìn ngang tầm màn hình.",
  Cui_Dau: "Cảnh báo: Bạn đang cúi thấp đầu hoặc gù lưng. Dễ mỏi cổ và hại cột sống.",
  Veo_Lung: "Cảnh báo: Người bị lệch sang một bên, vai bất cân xứng. Nguy cơ vẹo cột sống.",
  Mat_Qua_Gan: "Cảnh báo: Khoảng cách từ mắt tới màn hình quá gần. Dễ gây cận thị và mỏi mắt."
};

interface ViolationLog {
  id: string;
  type: string;
  time: string;
}

export default function App() {
  // Trạng thái chung
  const [activeTab, setActiveTab] = useState<'sys' | 'code'>('sys');
  const [modelUrl, setModelUrl] = useState<string>(DEFAULT_MODEL_URL);
  const [mode, setMode] = useState<'simulation' | 'camera'>('simulation');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  
  // Trạng thái AI Model
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [activeClass, setActiveClass] = useState<string>("Dung_Tu_The");
  const [classProbabilities, setClassProbabilities] = useState<Record<string, number>>({
    Dung_Tu_The: 1.0,
    Cui_Dau: 0.0,
    Veo_Lung: 0.0,
    Mat_Qua_Gan: 0.0
  });

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Logic chống báo sai tư thế giả (Debounce 5s)
  const [badPostureDuration, setBadPostureDuration] = useState<number>(0); // mili giây đã trôi qua
  const [isWarningActive, setIsWarningActive] = useState<boolean>(false);
  
  // Thống kê sức khỏe khi ngồi
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [goodPostureSeconds, setGoodPostureSeconds] = useState<number>(0);
  const [totalViolations, setTotalViolations] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<ViolationLog[]>([]);

  // Bộ đếm Pomodoro
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');
  const [focusLength, setFocusLength] = useState<number>(25); // phút
  const [breakLength, setBreakLength] = useState<number>(5); // phút
  const [timeRemaining, setTimeRemaining] = useState<number>(25 * 60); // giây
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(0);

  // Sao chép code
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeCodeFile, setActiveCodeFile] = useState<'html' | 'css' | 'js'>('js');

  // Thống kê chi tiết từng tư thế để vẽ biểu đồ real-time theo chủ đề Professional Polish
  const [classTimes, setClassTimes] = useState<Record<string, number>>({
    Dung_Tu_The: 0,
    Cui_Dau: 0,
    Veo_Lung: 0,
    Mat_Qua_Gan: 0
  });

  // FPS và Latency cho camera
  const [fps, setFps] = useState<number>(24);
  const [latency, setLatency] = useState<number>(42);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Chỉ số mô phỏng hệ thống ở footer
  const [cpuLoad, setCpuLoad] = useState<number>(12);
  const [memoryUsage, setMemoryUsage] = useState<number>(240);

  // Các Web Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tmWebcamRef = useRef<any>(null);
  const tmModelRef = useRef<any>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<any>(null);
  const badPostureTimerRef = useRef<any>(null);

  // Khởi động Audio Context khi người dùng tương ứng click
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Còi Bíp Bíp bằng AudioContext tự động
  const startBeepAlarm = () => {
    if (beepIntervalRef.current || !isSoundEnabled) return;
    
    initAudio();
    
    const playSingleBeep = () => {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Tần số 880Hz (nốt A5 cao vút dễ chú ý)
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // tắt sau 150ms
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      try {
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } catch (err) {
        // Ignored
      }
    };

    playSingleBeep();
    beepIntervalRef.current = setInterval(playSingleBeep, 450); // Lặp lại sau mỗi 450ms
  };

  const stopBeepAlarm = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
  };

  // Nhạc báo thành công hoàn thành Pomodoro (Ding Ding!)
  const playPomodoroCompletionSound = () => {
    if (!isSoundEnabled) return;
    initAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const playTone = (freq: number, delay: number, dur: number) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur + 0.1);
      }, delay);
    };

    playTone(523.25, 0, 0.3); // C5
    playTone(659.25, 200, 0.3); // E5
    playTone(783.99, 400, 0.5); // G5
  };

  // Đồng hồ Pomodoro chính
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Hết giờ! Chuyển đổi trạng thái Pomodoro
            playPomodoroCompletionSound();
            if (pomodoroMode === 'focus') {
              setPomodoroMode('break');
              setCompletedCycles(c => c + 1);
              return breakLength * 60;
            } else {
              setPomodoroMode('focus');
              return focusLength * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, pomodoroMode, focusLength, breakLength, isSoundEnabled]);

  // Bộ giám sát thời gian tích lũy sức khỏe (mỗi 1 giây cập nhật)
  useEffect(() => {
    const trackingInterval = setInterval(() => {
      // Chỉ tăng khi mô hình đang chạy hoặc chế độ mô phỏng đang bật
      if (mode === 'simulation' || (mode === 'camera' && isCameraActive && isModelLoaded)) {
        setTotalSeconds(prev => prev + 1);
        setClassTimes(prev => ({
          ...prev,
          [activeClass]: (prev[activeClass] || 0) + 1
        }));
        if (activeClass === "Dung_Tu_The") {
          setGoodPostureSeconds(prev => prev + 1);
        }
      }
    }, 1000);
    return () => clearInterval(trackingInterval);
  }, [mode, isCameraActive, isModelLoaded, activeClass]);

  // Bộ giám sát thông số hệ thống phần cứng (CPU, Memory) tự động thay đổi nhẹ
  useEffect(() => {
    const hardwareInterval = setInterval(() => {
      setCpuLoad(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2% đến +2%
        const next = prev + change;
        return Math.max(5, Math.min(35, next));
      });
      setMemoryUsage(prev => {
        const change = Math.floor(Math.random() * 9) - 4; // -4MB đến +4MB
        const next = prev + change;
        return Math.max(180, Math.min(320, next));
      });
    }, 3000);
    return () => clearInterval(hardwareInterval);
  }, []);

  // Giả lập dao động nhẹ FPS/Latency ở chế độ Simulator để tạo tính sinh động chân thật
  useEffect(() => {
    let simInterval: any = null;
    if (mode === 'simulation') {
      simInterval = setInterval(() => {
        setFps(Math.floor(58 + Math.random() * 3)); // 58-60 FPS
        setLatency(Math.floor(1 + Math.random() * 3)); // 1-3 ms latency
      }, 1500);
    }
    return () => clearInterval(simInterval);
  }, [mode]);

  // Logic tính bù giờ & đếm ngược cảnh báo 5 giây
  useEffect(() => {
    let warnInterval: any = null;
    
    const isBadPosture = activeClass !== "Dung_Tu_The";

    if (isBadPosture) {
      warnInterval = setInterval(() => {
        setBadPostureDuration(prev => {
          const next = prev + 200;
          if (next >= WARNING_DELAY) {
            if (!isWarningActive) {
              setIsWarningActive(true);
              setTotalViolations(v => v + 1);
              // Ghi log
              const now = new Date();
              const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
              setViolationLogs(prevLogs => [
                {
                  id: Math.random().toString(),
                  type: CLASS_LABELS[activeClass] || activeClass,
                  time: timeStr
                },
                ...prevLogs.slice(0, 9) // Giữ tối đa 10 log gần đây
              ]);
            }
          }
          return next;
        });
      }, 200);
    } else {
      // Ngồi đúng => Reset ngay lập tức
      setBadPostureDuration(0);
      setIsWarningActive(false);
      stopBeepAlarm();
    }

    return () => {
      if (warnInterval) clearInterval(warnInterval);
    };
  }, [activeClass, isWarningActive]);

  // Kích hoạt/tắt còi alarm theo trạng thái `isWarningActive`
  useEffect(() => {
    if (isWarningActive && isSoundEnabled) {
      startBeepAlarm();
    } else {
      stopBeepAlarm();
    }
    return () => stopBeepAlarm();
  }, [isWarningActive, isSoundEnabled]);

  // Khởi động Camera AI thực tế
  const startCameraAI = async () => {
    initAudio();
    setIsModelLoading(true);
    setModelError(null);
    try {
      // Kiểm tra sự tồn tại của thư viện trên window
      const tmPose = (window as any).tmPose;
      if (!tmPose) {
        throw new Error("Không thấy thư viện Teachable Machine Pose. Hãy kiểm tra kết nối mạng!");
      }

      // Tải mô hình
      const fullUrl = modelUrl.endsWith('/') ? modelUrl : `${modelUrl}/`;
      const modelJSON = `${fullUrl}model.json`;
      const metadataJSON = `${fullUrl}metadata.json`;

      const model = await tmPose.load(modelJSON, metadataJSON);
      tmModelRef.current = model;
      setIsModelLoaded(true);

      // Cấu hình webcam từ thư viện Teachable Machine
      const width = 480;
      const height = 360;
      const flip = true;
      const webcam = new tmPose.Webcam(width, height, flip);
      await webcam.setup({ facingMode: "user" }); // Yêu cầu truy cập webcam
      await webcam.play();
      tmWebcamRef.current = webcam;

      // Đồng nhất canvas
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }

      setIsCameraActive(true);
      setIsModelLoading(false);

      // Bắt đầu vòng lặp dự đoán
      runPredictionLoop();

    } catch (err: any) {
      console.error(err);
      setModelError(err.message || "Không thể khởi động camera hoặc tải mô hình. Vui lòng kiểm tra lại đường dẫn model hoặc cấp quyền camera!");
      setIsModelLoading(false);
      setMode('simulation'); // Fallback về trình mô phỏng
    }
  };

  // Dừng Camera AI thực tế
  const stopCameraAI = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (tmWebcamRef.current) {
      try {
        tmWebcamRef.current.stop();
      } catch (e) {}
      tmWebcamRef.current = null;
    }
    setIsCameraActive(false);
    setIsModelLoaded(false);
  };

  // Vòng lặp dự đoán Pose
  const runPredictionLoop = async () => {
    const loop = async () => {
      if (!isCameraActive && !tmWebcamRef.current) return;
      
      try {
        const startTime = performance.now();
        // Cập nhật khung hình camera
        const webcam = tmWebcamRef.current;
        if (webcam) {
          webcam.update();
          
          const model = tmModelRef.current;
          if (model) {
            // Dự đoán vị trí khớp (pose) và kết quả phân loại
            const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
            const predictions = await model.predict(posenetOutput);

            const endTime = performance.now();
            const frameLatency = Math.round(endTime - startTime);
            const nowTime = performance.now();
            const delta = nowTime - lastFrameTimeRef.current;
            lastFrameTimeRef.current = nowTime;
            const currentFps = Math.round(1000 / (delta || 1));
            
            if (currentFps > 0 && currentFps < 120) {
              setFps(prev => Math.round(prev * 0.85 + currentFps * 0.15));
            }
            if (frameLatency > 0 && frameLatency < 300) {
              setLatency(Math.round(frameLatency));
            }

            // Cập nhật điểm số lớp
            const probs: Record<string, number> = {};
            let maxClass = "Dung_Tu_The";
            let maxProb = 0;

            predictions.forEach((pred: any) => {
              probs[pred.className] = pred.probability;
              if (pred.probability > maxProb) {
                maxProb = pred.probability;
                maxClass = pred.className;
              }
            });

            setClassProbabilities(probs);
            setActiveClass(maxClass);

            // Vẽ bộ xương lên canvas
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                // Vẽ ảnh camera đối xứng
                ctx.drawImage(webcam.canvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
                
                // Vẽ các điểm mốc xương và skeletal lines nếu phát hiện được
                if (pose) {
                  const minPartConfidence = 0.5;
                  (window as any).tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
                  (window as any).tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
                }
              }
            }
          }
        }
        animationFrameIdRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Lỗi trong vòng lặp AI:", err);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);
  };

  // Lắng nghe chuyển chế độ
  useEffect(() => {
    if (mode === 'camera') {
      startCameraAI();
    } else {
      stopCameraAI();
      // Reset khi quay lại simulation
      setActiveClass("Dung_Tu_The");
      setClassProbabilities({
        Dung_Tu_The: 1.0,
        Cui_Dau: 0.0,
        Veo_Lung: 0.0,
        Mat_Qua_Gan: 0.0
      });
    }
    return () => stopCameraAI();
  }, [mode]);

  // Dọn dẹp còi khi unmount
  useEffect(() => {
    return () => {
      stopBeepAlarm();
    };
  }, []);

  // Tính tỷ lệ đứng thẳng
  const goodRatio = totalSeconds > 0 ? Math.round((goodPostureSeconds / totalSeconds) * 100) : 100;

  // Xử lý Pomodoro click
  const toggleTimer = () => {
    initAudio();
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining((pomodoroMode === 'focus' ? focusLength : breakLength) * 60);
  };

  const changeFocusLength = (len: number) => {
    setFocusLength(len);
    if (!isTimerRunning && pomodoroMode === 'focus') {
      setTimeRemaining(len * 60);
    }
  };

  const changeBreakLength = (len: number) => {
    setBreakLength(len);
    if (!isTimerRunning && pomodoroMode === 'break') {
      setTimeRemaining(len * 60);
    }
  };

  // Định dạng thời gian
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Hàm copy code
  const copyToClipboard = (text: string, filename: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // MÃ NGUỒN COPY DÀNH CHO VS CODE (HTML, CSS và JS như người dùng mong thích)

  // Chạy thử mô phỏng tư thế lỗi thủ công ngay trên trình duyệt (Để người dùng text không cần camera)
  const triggerSimulatePosture = (poseName: string) => {
    setActiveClass(poseName);
    
    // Tạo giả lập xác suất
    const mockProbs: Record<string, number> = {
      Dung_Tu_The: 0.05,
      Cui_Dau: 0.05,
      Veo_Lung: 0.05,
      Mat_Qua_Gan: 0.05
    };
    mockProbs[poseName] = 0.85; // đặt lớp được chọn làm lớn nhất
    setClassProbabilities(mockProbs);
    initAudio();
  };

  return (
    <div id="pose-app-container" className="min-h-screen bg-slate-950 text-slate-150 font-sans flex flex-col selection:bg-rose-500/30">
      
      {/* Thanh tiêu đề chính */}
      <header id="app-header" className="border-b border-slate-800 bg-slate-900/50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase text-slate-200">PoseAlert<span className="text-emerald-500">Gameon</span></h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">SYSTEM FOR SIT POSTURE MONITORING</p>
          </div>
        </div>

        {/* Status Indicators & Control Tabs */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end text-xs font-semibold uppercase tracking-widest">
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20 text-[10px] tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-pulse"></span> SYSTEM ONLINE
          </div>
          <span className="text-slate-500 text-[10px] font-mono hidden sm:inline">V2.0.4 STABLE</span>

          {/* Sound Toggle Button */}
          <button 
            id="sound-toggle-btn"
            onClick={() => { initAudio(); setIsSoundEnabled(!isSoundEnabled); }} 
            className={`p-1.5 rounded-lg border transition-all duration-300 flex items-center justify-center cursor-pointer ${
              isSoundEnabled 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
            }`}
            title={isSoundEnabled ? "Tắt âm báo bíp bíp" : "Bật âm báo bíp bíp"}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Quick Tab Selectors */}
          <div className="flex border border-slate-800 bg-slate-950/80 p-0.5 rounded-xl">
            <button 
              id="tab-ui-select"
              onClick={() => setActiveTab('sys')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'sys' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📊 BẢNG ĐIỀU KHIỂN
            </button>
            <button 
              id="tab-code-select"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'code' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>VS CODE</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'sys' ? (
          <motion.main 
            key="sys-main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Cột TRÁI: Camera AIoT, Predict Loop, Phân loại */}
            <div id="col-left" className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Thẻ Camera giám sát */}
              <div 
                id="camera-card" 
                className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 relative ${
                  isWarningActive ? 'warning-active border-rose-500' : 'border-slate-800'
                }`}
              >
                {/* Header Camera */}
                <div className="px-5 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/40">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${mode === 'camera' && isCameraActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                    <h2 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Cảm biến Camera AIoT Engine</h2>
                  </div>
                  
                  {/* Selector dạng nguồn */}
                  <div className="flex border border-slate-800 bg-slate-950 p-0.5 rounded-lg text-[10px] font-bold tracking-wider">
                    <button
                      id="mode-sim-btn"
                      onClick={() => setMode('simulation')}
                      className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${mode === 'simulation' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-205'}`}
                    >
                      🎮 CHẾ ĐỘ GIẢ LẬP
                    </button>
                    <button
                      id="mode-cam-btn"
                      onClick={() => setMode('camera')}
                      className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${mode === 'camera' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-205'}`}
                    >
                      📷 CAMERA LIVE AI
                    </button>
                  </div>
                </div>

                {/* Phân vùng Camera/Webcam chính thức */}
                <div class="p-6 bg-slate-950 flex flex-col items-center justify-center min-h-[320px] relative">
                  
                  {/* Overlay Cảnh báo Khẩn cấp nhấp nháy */}
                  <AnimatePresence>
                    {isWarningActive && (
                      <motion.div 
                        id="warning-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-rose-950/40 border-4 border-rose-500 pointer-events-none z-20 flex flex-col items-center justify-center"
                      >
                        <div class="bg-rose-600 text-white font-extrabold text-center px-6 py-3 rounded-2xl shadow-2xl uppercase tracking-wider text-sm md:text-base flex items-center gap-2 warning-pulse border border-rose-400/30">
                          <AlertTriangle class="w-5 h-5 animate-bounce" />
                          <span>CẢNH BÁO: BẠN ĐANG NGỒI SAI TƯ THẾ!</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {mode === 'camera' ? (
                    <div class="relative w-full max-w-md aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center shadow-inner">
                      {/* Thẻ canvas chính cho Teachable skeleton */}
                      <canvas 
                        id="webcam-canvas"
                        ref={canvasRef} 
                        class="w-full h-full object-cover transform scale-x-[-1]"
                      ></canvas>
                      
                      {!isCameraActive && !isModelLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950/95 gap-3">
                          <Camera className="w-12 h-12 text-slate-700" />
                          <p className="text-sm font-medium">Bật Camera AI để bắt đầu nhận diện chỉ số cơ thể</p>
                          <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed font-mono">Hệ thống sẽ dỡ cấu hình khớp xương Pose theo chuẩn Teachable Machine.</p>
                        </div>
                      )}

                      {isModelLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-400 gap-4">
                          <div className="w-8 h-8 rounded-full border-2 border-t-indigo-500 border-indigo-950 animate-spin"></div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">Đang dỡ cấu hình AI Pose Model...</p>
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">VUI LÒNG CẤP QUYỀN TRUY CẬP WEBCAM NẾU TRÌNH DUYỆT YÊU CẦU</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Trình GIẢ LẬP ĐÚNG/SAO TƯ THẾ (Simulator cực hữu ích)
                    <div className="w-full max-w-md bg-slate-900/20 border border-slate-850 p-6 rounded-2xl">
                      <div className="text-center mb-6">
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/15 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Trình mô phỏng trực tiếp
                        </span>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">Tiêu chuẩn mô phỏng phản hồi hệ sinh thái (độ trễ, CPU, Pomodoro loop) không cần webcam vật lý.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                          id="sim-good-btn"
                          onClick={() => triggerSimulatePosture("Dung_Tu_The")}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeClass === "Dung_Tu_The" 
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/5' 
                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <span className="text-xs font-bold">1. NGỒI ĐÚNG TƯ THẾ</span>
                        </button>
                        <button
                          id="sim-cuidau-btn"
                          onClick={() => triggerSimulatePosture("Cui_Dau")}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeClass === "Cui_Dau" 
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/5' 
                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                          <span className="text-xs font-bold">2. CÚI ĐẦU / GÙ LƯNG</span>
                        </button>
                        <button
                          id="sim-veolung-btn"
                          onClick={() => triggerSimulatePosture("Veo_Lung")}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeClass === "Veo_Lung" 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/5' 
                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                          <span className="text-xs font-bold">3. VẸO LƯNG / LỆCH VAI</span>
                        </button>
                        <button
                          id="sim-matgan-btn"
                          onClick={() => triggerSimulatePosture("Mat_Qua_Gan")}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            activeClass === "Mat_Qua_Gan" 
                              ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-md shadow-orange-500/5' 
                              : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                          <span className="text-xs font-bold">4. QUÁ SÁT MÀN HÌNH</span>
                        </button>
                      </div>

                      <div className="bg-indigo-950/25 border border-indigo-505/10 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-indigo-400 font-mono tracking-wide">
                          💡 Click một tư thế xấu (2, 3, 4) và giữ nguyên liên tục 5s để còi bíp bíp hoạt dộng!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Thanh đếm giây lỗi tư thế (Debounce) */}
                  <div class="w-full max-w-sm mt-5 bg-slate-900/60 rounded-xl p-3.5 border border-slate-850 relative z-30">
                    <div class="flex justify-between text-xs mb-1.5">
                      <span class="text-slate-400 flex items-center gap-1">
                        <Clock class="w-3.5 h-3.5 text-rose-400" />
                        Thời gian sai tư thế liên tục:
                      </span>
                      <span id="debounce-sec" class="text-rose-400 font-bold font-mono">
                        {(badPostureDuration / 1000).toFixed(1)}s / {(WARNING_DELAY / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div class="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div 
                        id="debounce-bar"
                        class="bg-gradient-to-r from-rose-600 to-rose-400 h-full transition-all duration-200"
                        style={{ width: `${Math.min((badPostureDuration / WARNING_DELAY) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Chân thẻ Camera - Dán link và bật/tắt */}
                {mode === 'camera' && (
                  <div class="p-4 bg-slate-900/60 border-t border-slate-850 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div class="w-full flex-grow">
                      <label class="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Đường dẫn Teachable Machine Model Cloud:</label>
                      <input 
                        id="model-url"
                        type="text" 
                        value={modelUrl}
                        onChange={(e) => setModelUrl(e.target.value)}
                        placeholder="Ví dụ: https://teachablemachine.withgoogle.com/models/H2kS8RPl8/"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 px-3 py-2 rounded-xl text-xs font-mono text-indigo-300 transition-all focus:outline-none"
                      />
                    </div>
                    <div class="w-full md:w-auto flex-shrink-0">
                      {isCameraActive ? (
                        <button
                          id="camera-stop-btn"
                          onClick={stopCameraAI}
                          class="w-full md:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                        >
                          Dừng Camera AI
                        </button>
                      ) : (
                        <button
                          id="camera-start-btn"
                          onClick={startCameraAI}
                          disabled={isModelLoading}
                          class="w-full md:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 text-white rounded-xl text-xs font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                        >
                          Bật Camera AI
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Trực quan hóa kết quả AI Real-time */}
              <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-850">
                  <h3 class="font-display font-semibold text-xs tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                    <Activity class="w-4 h-4 text-emerald-400 animate-pulse" />
                    Chỉ số định phân loại AIoT Edge
                  </h3>
                  <span class="text-[10px] text-slate-500 uppercase font-mono">4 Lớp nhận dạng</span>
                </div>

                {/* Khối Tư thế chính hiện tại */}
                <div className={`mb-5 p-4 rounded-xl border flex items-start gap-4 transition-all duration-300 ${
                  activeClass === "Dung_Tu_The" 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}>
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                    activeClass === "Dung_Tu_The" 
                      ? 'bg-emerald-500/20' 
                      : 'bg-rose-500/20'
                  }`}>
                    {activeClass === "Dung_Tu_The" ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 animate-pulse" />}
                  </div>
                  <div class="space-y-1">
                    <span class="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Trạng thái phát hiện:</span>
                    <h4 class="text-base font-bold text-white">{CLASS_LABELS[activeClass]}</h4>
                    <p class="text-xs text-slate-300 leading-relaxed">{CLASS_DESCRIPTIONS[activeClass]}</p>
                  </div>
                </div>

                {/* Danh sách các class và tiến trình */}
                <div className="flex flex-col gap-3">
                  {Object.entries(CLASS_LABELS).map(([key, labelName]) => {
                    const prob = classProbabilities[key] || 0;
                    const percent = Math.round(prob * 100);
                    const isOurKey = activeClass === key;
                    const isGoodKey = key === "Dung_Tu_The";
                    
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={`font-medium ${isOurKey ? (isGoodKey ? 'text-emerald-400' : 'text-rose-400 font-bold') : 'text-slate-400'}`}>
                            {labelName} ({key})
                          </span>
                          <span className={`font-mono font-bold ${isOurKey ? 'text-white' : 'text-slate-500'}`}>{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              isGoodKey ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ 
                              width: `${percent}%`,
                              opacity: isOurKey ? 1 : 0.3
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cột PHẢI: Pomodoro, Thống kê, Log vi phạm */}
            <div id="col-right" className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Thẻ Pomodoro */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[10px] tracking-wider uppercase text-slate-400 flex items-center gap-1.5 font-mono">
                    <Clock className="w-4 h-4 text-violet-400 font-bold" />
                    ĐỒNG HỒ QUẢ CÀ CHUA (POMODORO)
                  </h3>
                  <div className="bg-slate-950 px-2 py-0.5 rounded-md text-[9px] font-mono text-slate-500 border border-slate-850">
                    AUTO-LOOP
                  </div>
                </div>

                {/* Trực quan Đồng hồ */}
                <div className="flex flex-col items-center py-5 bg-slate-950/40 rounded-2xl border border-slate-850 relative">
                  
                  {/* Trạng thái Tập trung / Nghỉ ngơi */}
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full mb-3 uppercase tracking-wider border ${
                    pomodoroMode === 'focus' 
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {pomodoroMode === 'focus' ? "🎯 Thời gian Tập chung" : "🍃 Thời gian Nghỉ ngơi"}
                  </span>

                  {/* Đồng hồ số lớn */}
                  <span className="font-mono text-5xl md:text-6xl font-extrabold text-white tracking-widest mb-5 block">
                    {formatTime(timeRemaining)}
                  </span>

                  {/* Tổ hợp nút bấm điều khiển */}
                  <div className="flex items-center gap-3">
                    {isTimerRunning ? (
                      <button 
                        id="timer-btn-pause"
                        onClick={toggleTimer}
                        className="p-3 bg-slate-800 hover:bg-slate-750 text-slate-200 transition-all rounded-xl active:scale-95 text-xs font-bold flex items-center gap-1.5 px-4 shadow-md border border-slate-700 cursor-pointer"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Tạm dừng</span>
                      </button>
                    ) : (
                      <button 
                        id="timer-btn-start"
                        onClick={toggleTimer}
                        className="p-3 bg-violet-600 hover:bg-violet-500 text-white transition-all rounded-xl active:scale-95 text-xs font-bold flex items-center gap-1.5 px-4 shadow-lg shadow-violet-800/25 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        <span>Bắt đầu</span>
                      </button>
                    )}

                    <button 
                      id="timer-btn-reset"
                      onClick={resetTimer}
                      className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-450 hover:text-slate-350 rounded-xl transition-all cursor-pointer"
                      title="Đặt lại đồng hồ"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tinh chỉnh thời lượng nhanh */}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-850">
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Học tập / Làm việc:</label>
                    <div class="flex items-center gap-2">
                      <input 
                        id="input-focus-len"
                        type="number" 
                        value={focusLength}
                        onChange={(e) => changeFocusLength(Math.max(1, parseInt(e.target.value) || 25))}
                        disabled={isTimerRunning}
                        min="1"
                        max="180"
                        className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-violet-500 px-3 py-1.5 text-center font-mono font-bold text-white rounded-lg text-sm disabled:opacity-40"
                      />
                      <span class="text-xs text-slate-500">phút</span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Nghỉ xả hơi:</label>
                    <div class="flex items-center gap-2">
                      <input 
                        id="input-break-len"
                        type="number" 
                        value={breakLength}
                        onChange={(e) => changeBreakLength(Math.max(1, parseInt(e.target.value) || 5))}
                        disabled={isTimerRunning}
                        min="1"
                        max="60"
                        className="w-full bg-slate-950 border border-slate-800 focus:outline-none focus:border-violet-500 px-3 py-1.5 text-center font-mono font-bold text-white rounded-lg text-sm disabled:opacity-40"
                      />
                      <span class="text-xs text-slate-500">phút</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng phân tích trạng thái và Thống kê sức khỏe */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
                <h3 className="text-[10px] tracking-wider uppercase text-slate-400 flex items-center gap-1.5 font-mono">
                  <TrendingUp className="w-4 h-4 text-emerald-400 font-bold" />
                  CHỈ SỐ SỨC KHỎE & QUẢN TRỊ VI PHẠM
                </h3>

                {/* Dashboard Số liệu nhanh */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center flex flex-col justify-between">
                    <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide leading-tight mb-2">Tỉ lệ ngồi thẳng</span>
                    <span className={`block font-mono text-xl font-extrabold ${goodRatio > 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {goodRatio}%
                    </span>
                    <span className="text-[9px] text-slate-600 mt-1 block font-mono">TỶ LỆ LÝ TƯỞNG</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center flex flex-col justify-between">
                    <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide leading-tight mb-2">Số lỗi vi phạm</span>
                    <span className="block font-mono text-xl font-extrabold text-rose-450">
                      {totalViolations}
                    </span>
                    <span className="text-[9px] text-slate-600 mt-1 block font-mono">LẦN CẢNH BÁO</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center flex flex-col justify-between">
                    <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide leading-tight mb-2">Chu kỳ Pomodoro</span>
                    <span className="block font-mono text-xl font-extrabold text-violet-400">
                      {completedCycles}
                    </span>
                    <span className="text-[9px] text-slate-600 mt-1 block font-mono">HOÀN THÀNH</span>
                  </div>
                </div>

                {/* Đồ họa đo dãn cách */}
                <div class="w-full bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between gap-4">
                  <div class="space-y-1">
                    <span class="text-xs text-slate-400 font-medium font-mono">Tổng thời gian giám sát:</span>
                    <div class="text-slate-200 font-bold text-sm">
                      {Math.floor(totalSeconds / 60)} phút {totalSeconds % 60} giây
                    </div>
                  </div>
                  <div class="text-right space-y-1">
                    <span class="text-xs text-slate-400 font-medium font-mono">Đồng hồ đứng dáng:</span>
                    <div class="text-emerald-400 font-bold text-sm">
                      {Math.floor(goodPostureSeconds / 60)} phút {goodPostureSeconds % 60} giây
                    </div>
                  </div>
                </div>

                {/* Lịch sử vi phạm mới nhất */}
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sổ nhật ký vi phạm mới nhất (Max 10)</span>
                    {violationLogs.length > 0 && (
                      <button 
                        onClick={() => setViolationLogs([])}
                        class="text-[9px] text-slate-500 hover:text-slate-300 font-semibold"
                      >
                        Xóa lịch sử
                      </button>
                    )}
                  </div>

                  <div id="logs-container" class="max-h-[140px] overflow-y-auto flex flex-col gap-2 rounded-xl bg-slate-950 p-3 border border-slate-850 scrollbar-thin">
                    {violationLogs.length === 0 ? (
                      <div class="text-xs text-slate-500 text-center py-5 flex flex-col items-center justify-center gap-2">
                        <Trophy class="w-8 h-8 text-amber-500 animate-bounce" />
                        <div>Chưa phát hiện sai phạm nào. <br/><span class="text-[11px] text-slate-600">Bạn đang có dáng ngồi đỉnh cao!</span></div>
                      </div>
                    ) : (
                      violationLogs.map((log) => (
                        <div key={log.id} class="flex justify-between items-center p-2 rounded-lg bg-rose-950/20 text-rose-400 text-xs border border-rose-900/10">
                          <span class="font-medium flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                            {log.type}
                          </span>
                          <span class="font-mono text-[10px] text-slate-500">{log.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Hướng dẫn Teachable Machine */}
              <div class="bg-indigo-950/10 border border-indigo-900/30 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
                <Info class="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div class="space-y-1.5 leading-relaxed">
                  <span class="font-bold text-slate-200 block">Hướng dẫn huấn luyện mô hình của riêng bạn:</span>
                  <p>1. Truy cập <a href="https://teachablemachine.withgoogle.com/train/pose" target="_blank" rel="noreferrer" class="text-indigo-400 underline hover:text-indigo-300">Teachable Machine Pose</a>.</p>
                  <p>2. Tạo 4 Classes khớp chuẩn chữ hoa, thường, không dấu:</p>
                  <ul class="list-disc list-inside space-y-0.5 text-slate-400 pl-1 font-mono text-[11px]">
                    <li><code class="text-indigo-300">Dung_Tu_The</code></li>
                    <li><code class="text-indigo-300">Cui_Dau</code></li>
                    <li><code class="text-indigo-300">Veo_Lung</code></li>
                    <li><code class="text-indigo-300">Mat_Qua_Gan</code></li>
                  </ul>
                  <p>3. Record video các tư thế của bạn tương xứng, huấn luyện sau đó click <strong>Export Model</strong> → chọn tab <strong>Upload (shareable link)</strong> và bấm upload. Copy đường link được tạo dán vào ô Teachable Machine URL phía trên.</p>
                </div>
              </div>
            </div>
          </motion.main>
        ) : (
          <motion.main 
            key="code-main"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow max-w-5xl w-full mx-auto p-4 md:p-6"
          >
            {/* Giao diện xem và lấy mã nguồn dành cho VS Code */}
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
              
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 class="font-display text-lg font-bold text-white flex items-center gap-2">
                    <FileCode class="w-5 h-5 text-indigo-400" />
                    Mã nguồn hoàn chỉnh 3 File riêng biệt
                  </h2>
                  <p class="text-xs text-slate-400 mt-1">Copy từng file dưới đây cất vào thư mục của bạn trong VS Code để khởi chạy dự án độc lập cục bộ.</p>
                </div>
                
                {/* Selector 3 File */}
                <div class="flex border border-slate-800 bg-slate-950 p-0.5 rounded-xl self-start md:self-auto">
                  <button 
                    onClick={() => setActiveCodeFile('html')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeCodeFile === 'html' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1. index.html
                  </button>
                  <button 
                    onClick={() => setActiveCodeFile('css')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeCodeFile === 'css' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2. style.css
                  </button>
                  <button 
                    onClick={() => setActiveCodeFile('js')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeCodeFile === 'js' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3. script.js
                  </button>
                </div>
              </div>

              {/* Box hiển thị và Nút Copy */}
              <div class="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
                <div class="bg-slate-900/80 px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-850">
                  <span class="font-mono">{activeCodeFile === 'html' ? 'index.html' : activeCodeFile === 'css' ? 'style.css' : 'script.js'}</span>
                  
                  <button
                    onClick={() => {
                      const text = activeCodeFile === 'html' ? HTML_CODE : activeCodeFile === 'css' ? CSS_CODE : JS_CODE;
                      copyToClipboard(text, activeCodeFile);
                    }}
                    class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    {copiedFile === activeCodeFile ? (
                      <>
                        <Check class="w-3.5 h-3.5 text-emerald-400" />
                        <span class="text-emerald-400">Đã Copy!</span>
                      </>
                    ) : (
                      <>
                        <Copy class="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div class="p-4 overflow-x-auto max-h-[500px] text-xs font-mono text-slate-300 leading-relaxed scrollbar-thin whitespace-pre-wrap">
                  {activeCodeFile === 'html' && HTML_CODE}
                  {activeCodeFile === 'css' && CSS_CODE}
                  {activeCodeFile === 'js' && JS_CODE}
                </div>
              </div>

              <div class="bg-indigo-950/20 border border-indigo-900/20 p-4 rounded-xl text-xs text-indigo-300 space-y-2 leading-relaxed">
                <h4 class="font-bold flex items-center gap-1">
                  <Sparkles class="w-4 h-4 text-indigo-400" />
                  Cách khởi chạy cục bộ trên máy tính từ 3 File trên:
                </h4>
                <p>1. Tạo thư mục trống trên PC của bạn (Ví dụ: <code class="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 border border-slate-850">PoseAlert</code>)</p>
                <p>2. Mở VC Code, tạo đúng 3 file tên khớp chuẩn: <code class="text-indigo-400">index.html</code>, <code class="text-indigo-400 font-bold">style.css</code>, và <code class="text-indigo-400">script.js</code>.</p>
                <p>3. Dán toàn bộ code tương ứng được copy từ các tab bên trên lưu lại.</p>
                <p>4. Click chuột phải chọn <strong>Open with Live Server</strong> trong VS Code hoặc chỉ đơn giản nhấp đúp trực tiếp vào file <code class="text-indigo-400">index.html</code> để chạy trực tiếp trên bất kỳ trình duyệt nào mà không cần cài thêm Node.js!</p>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer class="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-auto">
        <div class="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>PoseAlertGameon © 2026. Giải pháp bảo vệ sức khỏe cột sống bằng Học máy thông minh.</p>
          <p class="text-[11px] text-slate-600">Phát triển trên nền tảng TensorFlow.js & Teachable Machine Pose.</p>
        </div>
      </footer>
    </div>
  );
}
