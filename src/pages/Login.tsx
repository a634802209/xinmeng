import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import './Login.css'

export default function Login() {
  const [form, setForm] = useState({
    email: '',
    code: '',
    agreed: false
  })
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()

  // 邮箱格式校验
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    let timer: number
    if (countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(c => c - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  // 发送验证码
  const sendCode = async () => {
    if (!isEmailValid) {
      setError('请输入有效的邮箱地址')
      return
    }
    try {
      setError('')
      const res = await authApi.sendCode(form.email)
      setCountdown(60)
      alert(`验证码已发送（演示模式）：${res.data?.demoCode || '123456'}`)
    } catch (err: any) {
      setError(err.message || '发送失败')
    }
  }

  // 登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.agreed) {
      setError('请先阅读并同意协议')
      return
    }
    
    setIsLoading(true)
    try {
      setError('')
      const res = await authApi.login(form.email, form.code)
      if (res.data?.userInfo && res.data?.token) {
        setAuth(res.data.userInfo, res.data.token)
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* 背景装饰 */}
      <div className="login-bg-decoration" />

      {/* 主登录卡片 */}
      <div className="login-card">
        {/* 左侧品牌展示区 */}
        <div className="brand-section">
          <div className="logo-wrapper">
            <img 
              src="/xinmeng-logo.png" 
              alt="XinMeng AI" 
              className="logo-img" 
            />
            <h1 className="brand-name">
              XinMeng AI
            </h1>
          </div>
          <p className="brand-slogan">
            ◇ 开启你的智能创作之旅 ◇
          </p>
        </div>

        {/* 右侧登录表单区 */}
        <div className="form-section">
          <div className="form-header">
            <h2 className="form-title">欢迎登录</h2>
            <p className="form-subtitle">使用邮箱继续登录 XinMeng AI</p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            {/* 邮箱输入框 */}
            <div className="form-item">
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="form-input"
                  placeholder="邮箱地址"
                  required
                />
              </div>
            </div>

            {/* 验证码输入框 + 获取按钮 */}
            <div className="form-item code-item">
              <div className="input-wrapper">
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="form-input"
                  placeholder="验证码"
                  required
                />
              </div>
              <button
                type="button"
                className="code-btn"
                disabled={countdown > 0 || !isEmailValid}
                onClick={sendCode}
              >
                {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              className="submit-btn"
              disabled={!form.agreed || isLoading}
            >
              {isLoading ? '登录中...' : '登录 / 注册'}
            </button>

            {/* 协议勾选 */}
            <div className="agreement-item">
              <input
                type="checkbox"
                checked={form.agreed}
                onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                id="agreement"
                className="agreement-checkbox"
              />
              <label htmlFor="agreement" className="agreement-text">
                我已阅读并同意
                <a href="#">《用户协议》</a>
                <a href="#">《隐私政策》</a>
              </label>
            </div>

            {/* 底部联系客服 */}
            <div className="help-text">
              遇到问题？ <a href="#" className="help-link">联系客服</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
