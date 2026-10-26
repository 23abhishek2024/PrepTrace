import { useNavigate } from 'react-router-dom'
import { motion } from "motion/react"
import { useState } from 'react'
import { FiAlertCircle, FiBarChart2, FiBriefcase, FiTarget, FiTrash2, FiTrendingUp, FiUploadCloud, FiUser, FiZap } from 'react-icons/fi'
import api from '../utils/axios'
import { useDispatch, useSelector } from 'react-redux'
import { setResume } from '../redux/resumeSlice'
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts"
const ScoreRing = ({ score }) => {
    const color = score >= 75 ? "#7c3aed" : score >= 50 ? "#f59e0b" : "#ef4444";
    return (
        <div className='relative flex items-center justify-center'>
            <RadialBarChart
                width={110}
                height={110}
                cx={55}
                cy={55}
                innerRadius={40}
                outerRadius={53}
                startAngle={90}
                endAngle={-270}
                data={[{ value: score, fill: color }]}
                barSize={8}
            >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "#e5e7eb" }} dataKey="value" cornerRadius={8} />

            </RadialBarChart>

            <div className='absolute flex  items-center'>
                <span className='text-lg font-bold text-white leading-none'>{score}</span>
                <span className='text-[9px] text-gray-200 mt-0.5'>/100</span>
            </div>

        </div>
    )
}

const Tag = ({ text, color }) => {
    const styles = {
        purple: "bg-purple-50 text-purple-700 border-purple-200",
        red: "bg-red-50    text-red-700    border-red-200",
        green: "bg-green-50  text-green-700  border-green-200",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
    return (
        <div className={`text-[10px] px-1.5 py-1 rounded-md border font-medium ${styles[color]}`}>
            {text}

        </div>
    )
}

const MAX_JD_LENGTH = 8000

// One rubric row: label, weight, 0-10 bar and the evidence line
const BreakdownRow = ({ item }) => {
    const percent = Math.round((item.score / 10) * 100)
    const color = item.score >= 7.5 ? "bg-green-400" : item.score >= 5 ? "bg-yellow-400" : "bg-red-400"
    return (
        <div className='space-y-1'>
            <div className='flex items-center justify-between gap-2'>
                <span className='text-[11px] font-medium text-white'>
                    {item.label}
                    <span className='ml-1.5 text-white/40'>{Math.round(item.weight * 100)}%</span>
                    {item.source === "computed" && (
                        <span className='ml-1.5 rounded bg-white/10 px-1 py-0.5 text-[9px] text-white/60'>exact match</span>
                    )}
                </span>
                <span className='text-[11px] font-semibold text-white'>{item.score}/10</span>
            </div>
            <div className='h-1.5 w-full rounded-full bg-white/10'>
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${percent}%` }} />
            </div>
            {item.evidence && <p className='text-[10px] leading-4 text-white/50'>{item.evidence}</p>}
        </div>
    )
}

const Navbar = ({ label }) => {
    const navigate = useNavigate()
    return (
        <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className='fixed inset-x-0 top-0 z-20 border-b border-black/8 bg-white/80 backdrop-blur-xl'>
            <div className='mx-auto flex h-12 max-w-7xl items-center justify-start px-3 sm:px-5'>
                <div onClick={() => navigate("/dashboard")}
                    className='flex cursor-pointer items-center gap-1.5'>
                    <span className='text-sm font-extrabold sm:text-base text-[#0A0A0A]'>PrepTrace</span>
                    <span className='hidden rounded bg-black/5 px-1.5 py-0.5 text-[10px] text-black/50 sm:block'>{label}</span>
                </div>

            </div>

        </motion.nav>

    )
}

function Scorer() {
    const [file, setFile] = useState(null)
    const [jobDescription, setJobDescription] = useState("")
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const dispatch = useDispatch()
    const { resume } = useSelector((state) => state.resume)

    // Deletes the saved resume and its cached AI results on the server
    const deleteResume = async () => {
        const ok = window.confirm("Delete your saved resume and its analysis? This cannot be undone.")
        if (!ok) return
        try {
            setDeleting(true)
            await api.delete("/api/resume")
            dispatch(setResume(null))
            setFile(null)
            setJobDescription("")
        } catch (error) {
            console.log(error)
            alert(error?.response?.data?.message || "Could not delete the resume")
        } finally {
            setDeleting(false)
        }
    }

    const uploadResume = async () => {
        if (!file) {
            alert("Please select a PDF")
            return
        }
        try {
            setLoading(true)

            const formData = new FormData()
            formData.append("resume", file)
            // Optional: when present, the score includes an exact JD keyword match
            if (jobDescription.trim()) {
                formData.append("jobDescription", jobDescription.trim())
            }

            const response = await api.post("/api/resume/upload", formData)

            dispatch(setResume(response?.data?.data))
            setLoading(false)

        } catch (error) {
            console.log(error)
            alert(error?.response?.data?.message || "Upload failed")
            setLoading(false)
        }
    }
    // scorer section

    if (resume) return (
        <div className='min-h-screen bg-white text-[#0A0A0A]'>
            <Navbar label="Resume Scorer" />

            <section className='max-w-6xl mx-auto px-3 pt-18 sm:pt-20 pb-8 space-y-3.5'>
                {/* header */}
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <p className='text-[10px] text-black/40 tracking-widest uppercase mb-0.5'>Resume Analysis</p>
                        <h2 className='text-lg font-bold'>{resume?.name}</h2>

                    </div>
                    <div className='flex items-center gap-2'>
                        <button onClick={() => dispatch(setResume(null))}
                            className='text-[10px] sm:text-xs text-black/50 hover:text-[#0A0A0A] border border-black/15 hover:border-black/35 px-2.5 py-1 rounded-lg transition-colors'>Re-upload</button>
                        <button onClick={deleteResume} disabled={deleting}
                            className='flex items-center gap-1 text-[10px] sm:text-xs text-red-600/80 hover:text-red-700 border border-red-300 hover:border-red-500 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40'>
                            <FiTrash2 size={12} />
                            {deleting ? "Deleting..." : "Delete"}
                        </button>
                    </div>
                </div>

                {/* Score */}

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-4 sm:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                    <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />

                    <div className='relative'>
                        <ScoreRing score={resume?.score} />

                    </div>
                    <div className='relative'>
                        <p className='text-white/50 text-xs mb-0.5'>Resume Score</p>
                        <p className='text-lg sm:text-xl font-bold mb-1.5 text-white'>
                            {resume.score >= 75 ? "Strong" : resume.score >= 50 ? "Average" : "Needs Work"}
                        </p>
                        <div className='flex items-center gap-1.5'>
                            <FiUser className='text-purple-400 text-xs' />
                            <span className='text-xs text-purple-300'>{resume?.suggestedRole}</span>
                        </div>
                        {resume?.jdMatch && (
                            <div className='mt-1 flex items-center gap-1.5'>
                                <FiBriefcase className='text-white/50 text-xs' />
                                <span className='text-[11px] text-white/60'>Scored against your job description</span>
                            </div>
                        )}

                    </div>

                </motion.div >

                {/* Score breakdown (rubric) */}
                {resume?.scoreBreakdown?.length > 0 && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.06 }}
                        className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                        <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />
                        <div className='relative flex items-center gap-1.5 mb-3'>
                            <FiBarChart2 className='text-purple-400' size={14} />
                            <span className='text-xs font-semibold text-white'>How your score is calculated</span>
                        </div>
                        <div className='relative grid grid-cols-1 gap-3 md:grid-cols-2'>
                            {resume.scoreBreakdown.map((item) => <BreakdownRow key={item.key} item={item} />)}
                        </div>
                    </motion.div>
                )}

                {/* JD match */}
                {resume?.jdMatch && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.065 }}
                        className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                        <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />
                        <div className='relative flex items-center justify-between gap-2 mb-2.5'>
                            <div className='flex items-center gap-1.5'>
                                <FiTarget className='text-green-400' size={14} />
                                <span className='text-xs font-semibold text-white'>Job description match</span>
                            </div>
                            <span className='text-xs font-bold text-white'>
                                Required skills: {resume.jdMatch.coverage}%
                                {resume.jdMatch.preferredCoverage != null && (
                                    <span className='ml-2 font-medium text-white/50'>Nice to have: {resume.jdMatch.preferredCoverage}%</span>
                                )}
                            </span>
                        </div>
                        <p className='relative text-[10px] text-white/45 mb-2'>Required skills found in your resume</p>
                        <div className='relative flex flex-wrap gap-1.5 mb-3'>
                            {resume.jdMatch.matched.length
                                ? resume.jdMatch.matched.map(s => <Tag key={s} text={s} color="green" />)
                                : <span className='text-[10px] text-white/40'>None</span>}
                        </div>
                        <p className='relative text-[10px] text-white/45 mb-2'>Required by the job, missing from your resume <span className='text-white/30'>(A / B = any one of them)</span></p>
                        <div className='relative flex flex-wrap gap-1.5'>
                            {resume.jdMatch.missing.length
                                ? resume.jdMatch.missing.map(s => <Tag key={s} text={s} color="red" />)
                                : <span className='text-[10px] text-white/40'>None</span>}
                        </div>
                        {(resume.jdMatch.preferredMatched?.length > 0 || resume.jdMatch.preferredMissing?.length > 0) && (
                            <>
                                <p className='relative text-[10px] text-white/45 mt-3 mb-2'>Nice to have <span className='text-white/30'>(green = you have it, yellow = missing)</span></p>
                                <div className='relative flex flex-wrap gap-1.5'>
                                    {resume.jdMatch.preferredMatched?.map(s => <Tag key={`p-${s}`} text={s} color="green" />)}
                                    {resume.jdMatch.preferredMissing?.map(s => <Tag key={`pm-${s}`} text={s} color="yellow" />)}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}

                {/* Weaknesses & Strengths */}
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>


                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.07 }}
                        className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4  sm:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                        <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />
                        <div className='relative flex items-center gap-1.5 mb-2.5'>
                            <FiAlertCircle className='text-green-400' size={14} />
                            <span className='text-xs font-semibold text-white'>Strengths</span>
                        </div>



                        <div className='relative flex flex-wrap gap-1.5'>

                            {resume?.strengths?.map(s => <Tag key={s} text={s} color="green" />)}

                        </div>

                    </motion.div>


                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.07 }}
                        className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4  sm:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                        <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />
                        <div className='relative flex items-center gap-1.5 mb-2.5'>
                            <FiAlertCircle className='text-yellow-400' size={14} />
                            <span className='text-xs font-semibold text-white'>Weaknesses</span>
                        </div>

                        <div className='relative flex flex-wrap gap-1.5'>

                            {resume?.weaknesses?.map(s => <Tag key={s} text={s} color="yellow" />)}

                        </div>

                    </motion.div>

                </div>

                {/* Missing Skills */}

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.09 }}
                    className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4  sm:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                    <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />
                    <div className='relative flex items-center gap-1.5 mb-2.5'>
                        <FiZap className='text-red-400' size={14} />
                        <span className='text-xs font-semibold text-white'>Missing Skills</span>
                    </div>

                    <div className='relative flex flex-wrap gap-1.5'>

                        {resume?.missingSkills?.map(s => <Tag key={s} text={s} color="red" />)}

                    </div>

                </motion.div>
                {/* Recommendations */}

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.12 }}
                    className='relative overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4  sm:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.2)]'>
                    <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />
                    <div className='relative flex items-center gap-1.5 mb-2.5'>
                        <FiTrendingUp className='text-purple-400' size={14} />
                        <span className='text-xs font-semibold text-white'>Recommendations</span>
                    </div>

                    <div className='relative flex flex-wrap gap-1.5'>

                        {resume?.recommendations?.map(s => <Tag key={s} text={s} color="purple" />)}

                    </div>

                </motion.div>



            </section>

        </div>
    )
    //upload section
    return (
        <div className='min-h-screen bg-white text-[#0A0A0A]'>
            <Navbar label="Resume Scorer" />


            <section className='flex min-h-screen items-center justify-center px-3 pt-18 pb-6'>

                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className='relative w-full max-w-sm rounded-3xl overflow-hidden bg-[#000000]/90 backdrop-blur-2xl border border-white/10 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] sm:p-6'>
                    <div className='absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none' />

                    <p className='relative text-[10px] text-white/40 tracking-widest uppercase mb-1.5'>Step 1 t0 2 </p>

                    <div className='relative w-full h-1 bg-white/10 rounded-full mb-4'>
                        <div className='h-1 bg-white rounded-full w-1/2' /></div>

                    <h2 className='relative text-lg font-bold mb-1 text-white'>
                        Upload Your Resume
                    </h2>
                    <p className='relative text-white/45 text-xs mb-4'>
                        We'll score it and give you actionable feedback
                    </p>


                    <label className={`relative flex flex-col items-center justify-center w-full h-40 sm:h-48 rounded-2xl border-2 border-dashed cursor-pointer transition-colors
              ${file
                            ? "border-white/40 bg-white/[0.06]"
                            : "border-white/15 bg-white/[0.03] hover:border-white/30"
                        }`}>
                        <FiUploadCloud className={`text-4xl sm:text-5xl mb-2.5 ${file ? "text-white" : "text-white/30"}`} />
                        <p className="text-xs font-medium text-white/80">
                            {file ? file.name : "Click or drag PDF here"}
                        </p>
                        <p className="text-[10px] text-white/35 mt-1">PDF only · Max 5MB</p>

                        <input type='file'
                            accept='.pdf'
                            className='hidden'
                            onChange={(e) => setFile(e.target.files[0])}
                        />
                    </label>

                    <div className='relative mt-3'>
                        <label className='text-[11px] font-medium text-white/70'>
                            Job description <span className='text-white/35'>(optional)</span>
                        </label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value.slice(0, MAX_JD_LENGTH))}
                            placeholder='Paste the job description to get a JD match score'
                            rows={4}
                            className='mt-1 w-full resize-none rounded-xl border border-white/15 bg-white/[0.03] p-2.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/35'
                        />
                        <p className='text-right text-[9px] text-white/30'>{jobDescription.length}/{MAX_JD_LENGTH}</p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.07 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={uploadResume}
                        disabled={!file || loading} className='relative mt-4 w-full h-10 rounded-xl font-semibold text-xs bg-white text-[#0A0A0A] shadow-[0_4px_14px_rgba(255,255,255,0.15)] hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all'>
                        {loading ? "Analyzing..." : "Analyze Resume"}

                    </motion.button>



                </motion.div>
            </section>




        </div>
    )
}

export default Scorer
