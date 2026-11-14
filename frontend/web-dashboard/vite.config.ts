import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const __dirname = import.meta.dirname

// Plugin hiển thị mã OTP trực tiếp lên Terminal chạy giao diện (Vite Dev Server)
function terminalOtpLoggerPlugin(): Plugin {
  return {
    name: 'terminal-otp-logger',
    configureServer(server) {
      server.middlewares.use('/__vite_terminal_log', (req, res) => {
        let body = ''
        req.on('data', chunk => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            console.log('\n\x1b[36m============================================================\x1b[0m')
            console.log(`\x1b[33m\x1b[1m>> [XÁC THỰC BẢO MẬT] MÃ OTP ĐƯỢC TẠO TỪ HỆ THỐNG <<\x1b[0m`)
            console.log(`Mục đích : ${data.action || 'Cập nhật số điện thoại / Đổi mật khẩu'}`)
            console.log(`Số ĐT    : \x1b[37m\x1b[1m${data.phone}\x1b[0m`)
            console.log(`MÃ OTP   : \x1b[32m\x1b[1m[ ${data.otpCode} ]\x1b[0m (Hiệu lực: 5 phút)`)
            console.log('\x1b[36m============================================================\x1b[0m\n')
          } catch (e) {}
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), terminalOtpLoggerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
})
