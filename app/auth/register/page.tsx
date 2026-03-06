'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Script from 'next/script'

export const dynamic = 'force-dynamic'

declare global {
  interface Window {
    VANTA: any
    THREE: any
  }
}

const FloatingLabelInput = ({ 
  type, 
  value, 
  onChange, 
  label, 
  id,
  showToggle,
  onToggle,
  showValue
}: { 
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  label: string
  id: string
  showToggle?: boolean
  onToggle?: () => void
  showValue?: boolean
}) => (
  <div className="form-control">
    <input 
      type={showToggle ? (showValue ? "text" : "password") : type}
      id={id}
      value={value}
      onChange={onChange}
      required
      className="pr-10"
    />
    <label htmlFor={id}>
      {label.split('').map((char, index) => (
        <span key={index} style={{ transitionDelay: `${index * 50}ms` }}>{char}</span>
      ))}
    </label>
    {showToggle && (
      <button 
        type="button"
        onClick={onToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-transparent border-0 cursor-pointer flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
      >
        {showValue ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        )}
      </button>
    )}
  </div>
)

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const router = useRouter()
  const vantaRef = useRef<HTMLDivElement>(null)
  const vantaEffectRef = useRef<any>(null)

  useEffect(() => {
    setSupabase(createBrowserClient())
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      const x = (e.clientX - centerX) / centerX
      const y = (e.clientY - centerY) / centerY
      setMousePos({ x: x * 4, y: y * 3 })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const initVanta = () => {
    if (!vantaRef.current) return false
    if (!window.VANTA || !window.THREE) return false
    
    if (vantaEffectRef.current) {
      vantaEffectRef.current.destroy()
    }
    
    vantaEffectRef.current = window.VANTA.BIRDS({
      el: vantaRef.current,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      backgroundColor: 0x0e3939,
      color1: 0x823838,
      color2: 0x00dfff,
      birdSize: 1,
      wingSpan: 30.00,
      speedLimit: 5.00,
      separation: 20.00,
      alignment: 20.00,
      cohesion: 20.00,
      quantity: 5.00
    })
    return true
  }

  useEffect(() => {
    const tryInitVanta = () => {
      if (initVanta()) return
      
      const checkInterval = setInterval(() => {
        if (initVanta()) {
          clearInterval(checkInterval)
        }
      }, 100)
      
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
      }, 3000)
      
      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
    
    tryInitVanta()
    
    return () => {
      if (vantaEffectRef.current) {
        vantaEffectRef.current.destroy()
        vantaEffectRef.current = null
      }
    }
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    
    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (error) throw error

      router.push('/auth/login?message=注册成功，请登录')
    } catch (error: any) {
      setError(error.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script 
        src="/three.min.js" 
        strategy="beforeInteractive"
      />
      <Script 
        src="/vanta.birds.min.js" 
        strategy="afterInteractive"
        onLoad={() => {
          initVanta()
        }}
      />
      
      <div className="min-h-screen flex items-center justify-center p-4 overflow-x-hidden relative">
        <div ref={vantaRef} className="fixed inset-0 z-0" />
        
        <div className="flex bg-white/60 backdrop-blur-lg rounded-[20px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.1)] max-w-[1000px] w-[95%] max-h-[85vh] relative z-10 animate-[slideUp_0.6s_ease]">
          <div className="flex-1 flex justify-center items-center p-5 bg-[rgba(232,232,232,0.4)] relative max-[900px]:hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,107,53,0.1)_0%,transparent_50%),radial-gradient(circle_at_70%_70%,rgba(123,44,191,0.1)_0%,transparent_50%)] pointer-events-none" />
            <svg className="w-full h-auto max-w-[400px] relative z-10" viewBox="0 0 400 280" width="400" height="280">
              <defs>
                <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF8A5B"/>
                  <stop offset="100%" stopColor="#FF6B35"/>
                </linearGradient>
                <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9D4EDD"/>
                  <stop offset="100%" stopColor="#7B2CBF"/>
                </linearGradient>
                <linearGradient id="blackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3D405B"/>
                  <stop offset="100%" stopColor="#2B2D42"/>
                </linearGradient>
                <linearGradient id="yellowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE066"/>
                  <stop offset="100%" stopColor="#FFD60A"/>
                </linearGradient>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.2)"/>
                </filter>
              </defs>
              
              <g className="character-purple" filter="url(#shadow)">
                <rect className="purple-body" x="80" y="20" width="100" height="200" fill="url(#purpleGradient)" rx="6"/>
                <rect x="85" y="25" width="25" height="60" fill="rgba(255,255,255,0.15)" rx="3"/>
                <circle cx="115" cy="60" r="9" fill="white"/>
                <circle className="purple-pupil-left" cx="115" cy="60" r="4.5" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle className="purple-pupil-left-highlight" cx="113" cy="58" r="1.5" fill="white" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle cx="145" cy="60" r="9" fill="white"/>
                <circle className="purple-pupil-right" cx="145" cy="60" r="4.5" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle className="purple-pupil-right-highlight" cx="143" cy="58" r="1.5" fill="white" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
              </g>

              <g className="character-black" filter="url(#shadow)">
                <rect className="black-body" x="170" y="80" width="80" height="140" fill="url(#blackGradient)" rx="6"/>
                <rect x="175" y="85" width="20" height="45" fill="rgba(255,255,255,0.1)" rx="3"/>
                <circle cx="195" cy="120" r="8" fill="white"/>
                <circle className="black-pupil-left" cx="195" cy="120" r="4" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle cx="193" cy="118" r="1.2" fill="white"/>
                <circle cx="225" cy="120" r="8" fill="white"/>
                <circle className="black-pupil-right" cx="225" cy="120" r="4" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle cx="223" cy="118" r="1.2" fill="white"/>
              </g>

              <g className="character-yellow" filter="url(#shadow)">
                <path className="yellow-body" d="M 250 100 Q 310 100 310 220 L 250 220 Z" fill="url(#yellowGradient)"/>
                <ellipse cx="262" cy="120" rx="10" ry="6" fill="rgba(255,255,255,0.4)"/>
                <circle cx="275" cy="140" r="8" fill="white"/>
                <circle className="yellow-pupil-left" cx="275" cy="140" r="4" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle className="yellow-pupil-left-highlight" cx="273" cy="138" r="1.2" fill="white" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle cx="305" cy="140" r="8" fill="white"/>
                <circle className="yellow-pupil-right" cx="305" cy="140" r="4" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle className="yellow-pupil-right-highlight" cx="303" cy="138" r="1.2" fill="white" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
              </g>

              <g className="character-orange" filter="url(#shadow)">
                <path className="orange-body" d="M 20 160 Q 90 60 160 160 L 20 160 Z" fill="url(#orangeGradient)"/>
                <ellipse cx="50" cy="135" rx="12" ry="8" fill="rgba(255,255,255,0.3)"/>
                <circle cx="65" cy="115" r="9" fill="white"/>
                <circle className="orange-pupil-left" cx="65" cy="115" r="4.5" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle className="orange-pupil-left-highlight" cx="63" cy="113" r="1.4" fill="white" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle cx="105" cy="115" r="9" fill="white"/>
                <circle className="orange-pupil-right" cx="105" cy="115" r="4.5" fill="#333" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <circle className="orange-pupil-right-highlight" cx="103" cy="113" r="1.4" fill="white" style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}/>
                <path className="orange-mouth" d="M 75 145 Q 85 155 95 145" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </g>
            </svg>
          </div>
          
          <div className="flex-1 bg-gradient-to-br from-[#2B2D42] to-[#3D405B] p-6 md:p-8 lg:p-10 relative flex flex-col justify-center overflow-y-auto">
            <div className="max-w-[350px] mx-auto relative z-10 w-full">
              <div className="flex justify-center mb-3">
                <svg id="logo-svg" viewBox="0 0 100 100" width="50" height="50">
                  <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#fff', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#87CEEB', stopOpacity: 1 }} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <g id="particles">
                    <circle cx="20" cy="30" r="2" fill="#87CEEB" opacity="0.6"/>
                    <circle cx="80" cy="25" r="1.5" fill="#FF6B35" opacity="0.5"/>
                    <circle cx="75" cy="70" r="2" fill="#FFD60A" opacity="0.4"/>
                    <circle cx="25" cy="75" r="1.5" fill="#87CEEB" opacity="0.5"/>
                  </g>
                  <g id="bounce">
                    <path d="M 50 20 L 75 32.5 L 75 57.5 L 50 70 L 25 57.5 L 25 32.5 Z" 
                          fill="url(#grad1)" 
                          filter="url(#glow)"
                          stroke="white"
                          strokeWidth="1"/>
                    <path d="M 50 28 L 67 37 L 67 53 L 50 62 L 33 53 L 33 37 Z" 
                          fill="#2B2D42"/>
                  </g>
                </svg>
              </div>
              
              <h1 className="text-center text-2xl font-bold text-white mb-1 tracking-tight">创建账户</h1>
              <p className="text-center text-[13px] text-white/60 mb-6">注册您的考勤账户</p>
              
              {error && (
                <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm text-center border border-red-500/30">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleRegister} className="flex flex-col gap-2">
                <FloatingLabelInput
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  label="姓名"
                />
                
                <FloatingLabelInput
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  label="邮箱"
                />
                
                <FloatingLabelInput
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="密码"
                  showToggle
                  onToggle={() => setShowPassword(!showPassword)}
                  showValue={showPassword}
                />
                
                <FloatingLabelInput
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  label="确认密码"
                  showToggle
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  showValue={showConfirmPassword}
                />
                
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#87CEEB] to-[#00dfff] text-[#2B2D42] border-0 rounded-full text-sm font-bold cursor-pointer mt-4 relative overflow-hidden tracking-wide hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(135,206,235,0.4)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none transition-all"
                >
                  {loading ? (
                    <span className="block w-[22px] h-[22px] border-[3px] border-[#2B2D42]/30 border-t-[#2B2D42] rounded-full animate-spin mx-auto"></span>
                  ) : (
                    <span>注册</span>
                  )}
                </button>
              </form>
              
              <div className="text-center mt-5 pt-4 border-t border-white/10 text-[13px] text-white/60">
                <span className="mr-1">已有账户?</span>
                <Link href="/auth/login" className="text-[#87CEEB] font-semibold hover:text-white transition-colors">
                  立即登录
                </Link>
              </div>
              
              <div className="text-center mt-4">
                <Link href="/" className="text-white/40 hover:text-white text-xs transition-colors">
                  ← 返回首页
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        <style jsx global>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-15px);
            }
          }
          
          @keyframes sway {
            0%, 100% {
              transform: rotate(-3deg);
            }
            50% {
              transform: rotate(3deg);
            }
          }
          
          @keyframes particles {
            0%, 100% {
              transform: translateY(0px);
              opacity: 0.6;
            }
            50% {
              transform: translateY(-8px);
              opacity: 1;
            }
          }
          
          @keyframes glow {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(135, 206, 235, 0.3));
            }
            50% {
              filter: drop-shadow(0 0 8px rgba(135, 206, 235, 0.6));
            }
          }
          
          .character-orange {
            animation: bounce 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
            transform-origin: center bottom;
            cursor: pointer;
            transition: transform 0.3s ease;
          }
          
          .character-orange:hover{
            animation-play-state: paused;
            transform: scale(1.05);
          }
          
          .character-purple{
            animation: sway 3s ease-in-out infinite;
            transform-origin: center bottom;
            cursor: pointer;
            transition: transform 0.3s ease;
          }
          
          .character-purple:hover{
            animation-play-state: paused;
            transform: scale(1.05);
          }
          
          .character-black{
            animation: bounce 2.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
            animation-delay: 0.3s;
            transform-origin: center bottom;
            cursor: pointer;
            transition: transform 0.3s ease;
          }
          
          .character-black:hover{
            animation-play-state: paused;
            transform: scale(1.05);
          }
          
          .character-yellow{
            animation: sway 2.8s ease-in-out infinite;
            animation-delay: 0.5s;
            transform-origin: center bottom;
            cursor: pointer;
            transition: transform 0.3s ease;
          }
          
          .character-yellow:hover{
            animation-play-state: paused;
            transform: scale(1.05);
          }
          
          #logo-svg #particles{
            animation: particles 3s ease-in-out infinite;
          }
          
          #logo-svg #bounce{
            animation: bounce 3s ease-in-out infinite;
            transform-origin: center;
          }
          
          #logo-svg{
            animation: glow 3s ease-in-out infinite;
          }
          
          .form-control {
            position: relative;
            margin: 8px 0 24px;
            width: 100%;
          }
          
          .form-control input {
            background-color: transparent;
            border: 0;
            border-bottom: 2px solid rgba(255,255,255,0.3);
            display: block;
            width: 100%;
            padding: 12px 0;
            font-size: 16px;
            color: #fff;
          }
          
          .form-control input:focus,
          .form-control input:valid {
            outline: 0;
            border-bottom-color: #87CEEB;
          }
          
          .form-control label {
            position: absolute;
            top: 12px;
            left: 0;
            pointer-events: none;
          }
          
          .form-control label span {
            display: inline-block;
            font-size: 16px;
            min-width: 5px;
            color: rgba(255,255,255,0.6);
            transition: 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }
          
          .form-control input:focus + label span,
          .form-control input:valid + label span {
            color: #87CEEB;
            transform: translateY(-28px);
          }
        `}</style>
      </div>
    </>
  )
}
