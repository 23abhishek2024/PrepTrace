import { useState } from "react";
import { FiX, FiMail, FiLock, FiUser, FiArrowRight } from "react-icons/fi";
import { motion } from "motion/react";
import api from "../utils/axios";

function LoginModel({ onClose, setUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }
        const response = await api.post("/api/auth/register", {
          name,
          email,
          password,
        });
        if (response?.data?.user) {
          setUser(response.data.user);
          onClose();
        }
      } else {
        const response = await api.post("/api/auth/login", {
          email,
          password,
        });
        if (response?.data?.user) {
          setUser(response.data.user);
          onClose();
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div
        className="relative w-full max-w-sm
        bg-[#0A0A0A]/90 backdrop-blur-2xl
        border border-white/10
        rounded-2xl
        overflow-hidden
        shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

        <div className="relative p-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          >
            <FiX size={18} />
          </button>

          <h2 className="text-xl font-bold text-center mb-1 text-white">
            {isRegister ? "Create Account on" : "Sign In to"}{" "}
            <span className="font-extrabold text-xl tracking-tight text-white bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              PrepTrace
            </span>
          </h2>
          <p className="text-white/50 text-center text-xs mb-5">
            {isRegister
              ? "Start your AI interview and career journey"
              : "Continue your AI interview journey"}
          </p>

          {/* Toggle Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-5 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !isRegister
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError("");
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                isRegister
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-3 text-white/30 text-sm" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-white/60 text-xs font-medium mb-1">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-3 text-white/30 text-sm" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-xs font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-white/30 text-sm" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? (
                "Please wait..."
              ) : (
                <>
                  <span>{isRegister ? "Create Account" : "Sign In"}</span>
                  <FiArrowRight size={14} />
                </>
              )}
            </motion.button>
          </form>
        </div>

        <div className="relative border-t border-white/10 bg-black/40 p-3.5 text-center">
          <p className="text-white/40 text-[11px]">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
              className="text-white font-medium hover:underline ml-1"
            >
              {isRegister ? "Sign In" : "Register here"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginModel;
