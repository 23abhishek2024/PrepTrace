import { useEffect, useRef, useState, useCallback } from 'react'
import maleVideo from "../../assets/male-ai.mp4"
import femaleVideo from "../../assets/female-ai.mp4"
import { AnimatePresence, motion } from "motion/react"
import { FiArrowRight, FiCamera, FiCameraOff, FiClock, FiCode, FiMessageSquare, FiMic, FiMicOff, FiSkipForward, FiXCircle } from 'react-icons/fi'
import CodeEditor from './CodeEditor'
import Timer from './Timer'
import { endInterview, submitAnswer } from '../../apis/interview.api'
import { useNavigate } from 'react-router-dom'

// Final phrases of one listening session, with repeats removed.
// Chrome sometimes re-sends text it already recognized (the same phrase again,
// or the previous phrase plus a few new words), which used to produce
// "is more than is more than a ...".
const collectPhrases = (results) => {
  const phrases = [];
  for (let i = 0; i < results.length; i++) {
    if (!results[i].isFinal) continue;
    const text = results[i][0].transcript.trim();
    if (!text) continue;

    const last = phrases[phrases.length - 1];
    const lower = text.toLowerCase();
    const lastLower = last ? last.toLowerCase() : "";

    if (last && lower.startsWith(lastLower)) phrases[phrases.length - 1] = text; // same phrase, now longer
    else if (last && lastLower.endsWith(lower)) continue; // repeat of the previous phrase
    else phrases.push(text);
  }
  return phrases;
};

function Step2interview({ interviewData, user }) {
  const navigate = useNavigate()
  // ── State ──
  const [question, setQuestion] = useState(interviewData.question);
  const [currentIndex, setCurrentIndex] = useState(interviewData.currentQuestion || 0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(interviewData.question?.timer || 60);
  const [timerActive, setTimerActive] = useState(true); // paused once the answer is submitted

  // UI toggles
  const [micOn, setMicOn] = useState(true); // user's manual preference — only changed by the mic button
  const [cameraOn, setCameraOn] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  // Speech
  const [isAIPlaying, setIsAIPlaying] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceGender, setVoiceGender] = useState("female");

  // Refs
  const aiVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const introSpokenRef = useRef(false);
  const isInitialMount = useRef(true);
  const answerRef = useRef(answer);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  const videoSource = voiceGender === "female" ? femaleVideo : maleVideo;
  const progress = ((currentIndex + 1) / (interviewData.totalQuestions)) * 100;
  const showMicon = micOn && !isAIPlaying;

  // ── Speech-to-text ──
  // The spoken text is REBUILT from all final phrases on every result event
  // (never appended), then added to the text that was in the box when
  // listening started. Re-sent results therefore cannot duplicate words.
  const mountedRef = useRef(true);
  const listeningRef = useRef(false); // recognition is running right now
  const wantMicRef = useRef(false); // it should be running (mic on, AI not speaking)
  const baseTextRef = useRef(""); // answer text before the spoken part
  const phrasesSeenRef = useRef(0); // phrases recognized in this session
  const phrasesUsedRef = useRef(0); // phrases already included in baseTextRef

  // Set the answer directly (typing, code editor, next question).
  // Speech keeps adding after this text.
  const replaceAnswer = useCallback((value) => {
    baseTextRef.current = value;
    phrasesUsedRef.current = phrasesSeenRef.current;
    setAnswer(value);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onstart = () => {
      listeningRef.current = true;
      baseTextRef.current = answerRef.current.trim();
      phrasesSeenRef.current = 0;
      phrasesUsedRef.current = 0;
    };

    rec.onresult = (e) => {
      const phrases = collectPhrases(e.results);
      phrasesSeenRef.current = phrases.length;
      const spoken = phrases.slice(phrasesUsedRef.current).join(" ");
      const base = baseTextRef.current;
      setAnswer(spoken ? (base ? `${base} ${spoken}` : spoken) : base);
    };

    rec.onerror = (e) => {
      // Microphone permission denied: stop trying to restart
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantMicRef.current = false;
      }
    };

    // Chrome stops listening after a few seconds of silence: restart if still wanted
    rec.onend = () => {
      listeningRef.current = false;
      if (!wantMicRef.current || !mountedRef.current) return;
      setTimeout(() => {
        if (wantMicRef.current && mountedRef.current && !listeningRef.current) {
          try { rec.start(); } catch { /* already starting */ }
        }
      }, 250);
    };

    recognitionRef.current = rec;

    // Leaving the page: stop listening, speaking and the camera
    return () => {
      mountedRef.current = false;
      wantMicRef.current = false;
      try { rec.abort(); } catch { /* not running */ }
      window.speechSynthesis?.cancel();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startMic = useCallback(() => {
    if (!mountedRef.current) return;
    wantMicRef.current = true;
    if (listeningRef.current) return;
    try { recognitionRef.current?.start(); } catch { /* already started */ }
  }, []);

  const stopMic = useCallback(() => {
    wantMicRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* not running */ }
  }, []);

  const toggleMic = () => {
    if (micOn) {
      stopMic();
    } else {
      startMic();
    }
    setMicOn(!micOn);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        setCameraOn(true);
        setTimeout(() => {
          if (userVideoRef.current) userVideoRef.current.srcObject = stream;
        }, 100);
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraOn(false);
      }
    }
  };

  const handleSubmitCode = (code) => {
    const prev = answerRef.current;
    const separator = prev.trim() ? "\n\n--- Code ---\n" : "--- Code ---\n";
    replaceAnswer(prev + separator + code);
    setCodeOpen(false);
  };

  useEffect(() => {
    if (timeLeft <= 0 || !timerActive) return;
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, timerActive]);

  useEffect(() => {
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const female = voices.find((v) => /zira|samantha|female/i.test(v.name));
      const male = voices.find((v) => /david|mark|male/i.test(v.name));
      if (female) { setSelectedVoice(female); setVoiceGender("female"); }
      else if (male) { setSelectedVoice(male); setVoiceGender("male"); }
      else { setSelectedVoice(voices[0]); setVoiceGender("female"); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const speakText = useCallback((text) =>
    new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice || !text?.trim()) { resolve(); return; }

      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(text.replace(/,/g, ", ... ").replace(/\./g, ". ... "));
        utter.voice = selectedVoice;
        utter.rate = 0.92;
        utter.pitch = 1.05;
        utter.volume = 1;
        utter.onstart = () => {
          setIsAIPlaying(true);
          stopMic();
          aiVideoRef.current?.play();
        };
        utter.onend = () => {
          aiVideoRef.current?.pause();
          setIsAIPlaying(false);
          if (micOn) startMic();
          setTimeout(() => { setSubtitle(""); resolve(); }, 300);
        };
        setSubtitle(text);
        window.speechSynthesis.speak(utter);
      }, 150);
    }), [selectedVoice, micOn, startMic, stopMic]);

  useEffect(() => {
    if (!selectedVoice || introSpokenRef.current) return;
    introSpokenRef.current = true;
    const runIntro = async () => {
      await new Promise((r) => setTimeout(r, 1200));
      const firstName = user?.name ? user.name.split(" ")[0] : "Candidate";
      await speakText(`Welcome ${firstName}! Let's begin your interview.`);
      await new Promise((r) => setTimeout(r, 900));
      await speakText(interviewData.question?.question);
    };
    runIntro();
  }, [selectedVoice, speakText, user?.name, interviewData.question?.question]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!selectedVoice) return;
    const speakQuestion = async () => {
      await new Promise((r) => setTimeout(r, 900));
      await speakText(question?.question);
    };
    speakQuestion();
  }, [question, selectedVoice, speakText]);

  // Stop the AI voice immediately (used by Skip and End interview)
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    aiVideoRef.current?.pause();
    setIsAIPlaying(false);
    setSubtitle("");
  }, []);

  // After an answer is submitted or skipped: feedback, then next question or report
  const handleResult = useCallback(async (res, { speakFeedback = true } = {}) => {
    if (!res) {
      setLoading(false);
      setTimeLeft((t) => (t <= 0 ? 30 : t)); // avoid an instant auto-submit loop
      setTimerActive(true);
      alert("Could not submit the answer. Check that the backend is running and try again.");
      return;
    }

    const doneMessage = "Great job! Your interview is complete. Preparing your report now.";

    if (res.completed) {
      if (speakFeedback) setFeedback(res.feedback);
      await new Promise((r) => setTimeout(r, 700));
      await speakText(speakFeedback ? res.feedback?.feedback || doneMessage : doneMessage);
      setLoading(false);
      navigate(`/interview/${interviewData.interviewId}/report`);
      return;
    }

    if (speakFeedback) {
      setFeedback(res.feedback);
      await new Promise((r) => setTimeout(r, 700));
      await speakText(res.feedback?.feedback || "Noted your answer. Let's move to the next question.");
    }
    setLoading(false);
    setQuestion(res.question);
    setCurrentIndex(res.currentQuestion);
    replaceAnswer("");
    setFeedback(null);
    setTimeLeft(res.question?.timer || 60);
    setTimerActive(true);
  }, [speakText, navigate, interviewData.interviewId, replaceAnswer]);

  // Time over: submit whatever is in the box (an empty answer scores 0 without an AI call)
  useEffect(() => {
    if (timeLeft !== 0 || !timerActive) return;
    const autoSubmit = async () => {
      setTimerActive(false);
      setLoading(true);
      await speakText("Time is up. Submitting your answer now.");
      const res = await submitAnswer({
        interviewId: interviewData.interviewId,
        answer: answerRef.current.trim(),
      });
      await handleResult(res);
    };
    autoSubmit();
  }, [timeLeft, timerActive, interviewData.interviewId, speakText, handleResult]);

  const submit = async () => {
    if (loading || !answer.trim()) return;

    setTimerActive(false);
    setLoading(true);

    const res = await submitAnswer({ interviewId: interviewData.interviewId, answer });
    await handleResult(res);
  };

  // Skip: sends an empty answer (scored 0 on the server, no AI call) and moves on
  const skip = async () => {
    if (loading) return;
    stopSpeaking();
    setTimerActive(false);
    setLoading(true);

    const res = await submitAnswer({ interviewId: interviewData.interviewId, answer: "" });
    await handleResult(res, { speakFeedback: false });
  };

  // End early: the typed answer (if any) is evaluated, and the report
  // covers only the questions answered so far
  const endEarly = async () => {
    if (loading) return;
    const ok = window.confirm(
      "End the interview now? Your typed answer (if any) will be submitted, and the report will cover only the questions you answered."
    );
    if (!ok) return;

    stopSpeaking();
    stopMic();
    setTimerActive(false);
    setLoading(true);

    const res = await endInterview({
      interviewId: interviewData.interviewId,
      answer: answerRef.current.trim(),
    });
    setLoading(false);

    if (!res) {
      alert("Could not end the interview. Check that the backend is running and try again.");
      setTimerActive(true);
      if (micOn) startMic();
      return;
    }

    // Nothing was answered: there is no report, go back to the interview setup
    if (res.discarded) {
      navigate("/interview");
      return;
    }
    navigate(`/interview/${interviewData.interviewId}/report`);
  };

  return (
    <div className='min-h-screen bg-white flex items-center justify-center p-3 sm:p-5'>


      {codeOpen && <CodeEditor onClose={()=>setCodeOpen(false)} onSubmitCode={handleSubmitCode} />}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className='w-full max-w-5xl bg-[#0E1016] border border-white/10 rounded-2xl sm:rounded-[24px] overflow-hidden shadow-[0_0_60px_rgba(255,255,255,.03)] grid lg:grid-cols-[36%_64%]'>
        {/* left */}

        <div className='flex flex-col border-b lg:border-b-0 lg:border-r border-white/8 p-4 sm:p-5 gap-3'>

          {/* Ai Video */}
          <div className='relative rounded-xl overflow-hidden bg-black aspect-video'>
            <video
              src={videoSource}
              ref={aiVideoRef}
              muted
              playsInline
              preload="auto"
              loop
              className="w-full h-full object-cover"
            />
            {isAIPlaying && (
              <div className='absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1'>
                <div className='flex gap-0.5 items-end h-3'>
                  {[1, 2, 3].map(i => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-white rounded-full"
                      animate={{ height: ["4px", "12px", "4px"] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
                <span className='text-[10px] text-white/80'>AI Speaking</span>
              </div>
            )}
          </div>

          <div className='min-h-[52px] flex items-center'>
            <AnimatePresence>
              {subtitle &&
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className='w-full rounded-xl bg-white/5 border border-white/8 px-3 py-2'>
                  <p className="text-xs text-white/65 leading-relaxed text-center">{subtitle}</p>

                </motion.div>}

             
            </AnimatePresence>

            
          </div>


          <div className='relative rounded-xl overflow-hidden bg-[#17181E] border border-white/8 aspect-video flex items-center justify-center'>
            {cameraOn ?
              <>
                <video
                  ref={userVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className='absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5'>
                <span className="text-[10px] text-white/70">You</span>
                </div>
              </>
              :
              <div className='flex flex-col items-center gap-2'>
                <div className='w-14 h-14 rounded-full bg-white/10 border border-white/15 flex items-center justify-center'>
                <span className='text-2xl font-bold text-white'>{user?.name.charAt(0).toUpperCase()}</span>
                </div>
                <span className='text-xs text-white/35'>{user?.name.split(" ")[0]}</span>
                </div>}     
          </div>


          <div className='flex flex-col items-center gap-1.5 pt-1'>
            <div className='flex items-center justify-center gap-3'>
              <motion.button
              onClick={toggleMic} 
              whileHover={{ scale: 1.08 }} 
              whileTap={{ scale: 0.93 }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  showMicon ? "bg-white/10 border-white/15 text-white" : "bg-red-500/20 border-red-500/30 text-red-400"
                }`}>
                  {showMicon ? <FiMic size={15}/> : <FiMicOff size={15}/>}

              </motion.button>

              <motion.button 
              whileHover={{ scale: 1.08 }} 
              whileTap={{ scale: 0.93 }}
              onClick={toggleCamera}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  cameraOn ? "bg-white/10 border-white/15 text-white" : "bg-white/5 border-white/10 text-white/45 hover:text-white/70"
                }`}>
                  {cameraOn ? <FiCamera size={15}/> : <FiCameraOff size={15}/>}
                

              </motion.button>

              <motion.button 
              whileHover={{ scale: 1.08 }} 
              whileTap={{ scale: 0.93 }}
              onClick={()=>setCodeOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center border bg-white/5 border-white/10 text-white/45 hover:text-white/70 hover:border-white/20 transition-all">

                <FiCode size={15}/>
                
              </motion.button>


            </div>

            <div className='min-h-[14px] flex items-center justify-center'>
              {micOn && isAIPlaying && (
                <span className="text-[10px] text-red-400/80">Mic paused — AI is speaking</span>)}
            </div>

            <span className="text-[10px] text-white/35 text-center">
              Coding question? Use <FiCode size={9} className="inline -mt-0.5" /> to write &amp; add code
            </span>

          </div>

        </div>
        {/* right */}

        <div className='flex flex-col p-4 sm:p-6'>


          <div className='flex items-start justify-between mb-4'>

            <div> 
              <h2 className='text-base sm:text-lg font-semibold text-white'>
                AI Interview
              </h2>
              <div className='flex items-center gap-2 text-zinc-500 text-xs mt-0.5'>
                <FiClock size={11}/>
                <span>{question.difficulty}</span>

              </div>
            </div>

            <div className='flex flex-col items-end gap-1.5 min-w-[110px]'>
              <Timer timeLeft={timeLeft} totalTime={question.timer || 60}/>

            </div>
          </div>


          <motion.div 
          initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          className='relative overflow-hidden rounded-xl bg-[#17181E] border border-white/8 p-4 sm:p-5 mb-4'>
            <div className='absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none'/>
            <div className='relative flex items-center gap-2.5 mb-3'>
              <div className='w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0'>
                <FiMessageSquare size={14}/>
              </div>
              <p className='text-xs text-zinc-500'>Question {currentIndex + 1}</p>
            </div>
            <p className='relative text-white text-sm sm:text-base leading-7'>
              {question.question}</p>

          </motion.div>

          <div className='mb-3'>
            <div className='flex justify-between text-[10px] text-white/35 mb-1'>
            <span>Progress</span>
            <span>{currentIndex+1}/{interviewData.totalQuestions}</span>
            </div>
            <div className='w-full h-1 rounded-full bg-white/10 overflow-hidden'>
            <div className='h-full bg-white rounded-full transition-all duration-500' style={{width: `${progress}%`}} /></div>
          </div>

          <div className='flex-1 flex flex-col min-h-0'>
            <label className='text-xs font-medium text-zinc-400 mb-1.5'>Your Answer</label>
            <textarea
            onChange={(e)=>replaceAnswer(e.target.value)}
            value={answer}
            rows={5}
            onKeyDown={(e)=>{if(e.ctrlKey && e.key === "Enter") submit()}}
            placeholder='Write your answer here… or speak if mic is on'
             className='flex-1 w-full rounded-xl bg-[#17181E] border border-white/8 p-4 text-sm text-white outline-none resize-none focus:border-white/25 transition placeholder-white/20'/>
          </div>

          <div className='mt-3 min-h-[0px]'>
            <AnimatePresence>
              {feedback && (
                <motion.div 
                initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 ,y:6}}
                className='rounded-xl border border-green-500/20 bg-green-500/5 p-4 max-h-40 overflow-y-auto'>
                  <p className='text-xs uppercase tracking-widest text-green-400 mb-2'>AI Feedback</p>
                  <p className='text-sm text-zinc-300 leading-6'>{feedback.feedback}</p>

                </motion.div>)}
            </AnimatePresence>
          </div>


          <div className='flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/8'>
          <span className='text-xs text-zinc-600 hidden sm:block'>
            Press{" "}
            <span className='mx-1 rounded bg-white/10 px-1.5 py-0.5 text-white text-[10px]'>
             Ctrl+Enter
            </span>to Submit
          </span>

          <div className='ml-auto flex items-center gap-2'>
          {/* End the interview early: report covers answered questions only */}
          <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={endEarly}
              disabled={loading}
              title='End now and get a report for the questions you answered'
              className='h-10 px-3 rounded-xl border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-1.5 hover:bg-red-500/10 disabled:opacity-40 transition'>
              <FiXCircle size={14} /> End interview
          </motion.button>

          {/* Skip: scored 0, moves to the next question */}
          <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={skip}
              disabled={loading}
              title='Skip this question (scored 0)'
              className='h-10 px-3 rounded-xl border border-white/15 text-white/70 text-xs font-medium flex items-center gap-1.5 hover:bg-white/5 disabled:opacity-40 transition'>
              <FiSkipForward size={14} /> Skip
          </motion.button>

          <motion.button
          whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={submit}
              disabled={loading || !answer.trim()}
              className='h-10 min-w-[150px] justify-center px-5 rounded-xl bg-white text-black text-sm font-semibold flex items-center gap-2 disabled:opacity-40 transition'


              >
                 {loading ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  Submitting…
                </>
              ) : (
                <>Submit Answer <FiArrowRight size={15} /></>
              )}

          </motion.button>
          </div>

          </div>


        </div>


      </motion.div>



    </div>
  )
}

export default Step2interview
