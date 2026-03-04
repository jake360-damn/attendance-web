import Link from 'next/link'
import { Calendar, Users, FileSpreadsheet, Shield } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            考勤管理系统
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            支持多用户协作的在线考勤管理平台，轻松上传、编辑和导出Excel考勤文件
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/auth/login"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              立即登录
            </Link>
            <Link
              href="/auth/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              注册账号
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<FileSpreadsheet className="w-8 h-8" />}
            title="Excel管理"
            description="支持上传、解析和导出Excel考勤文件"
          />
          <FeatureCard
            icon={<Users className="w-8 h-8" />}
            title="多用户协作"
            description="多人同时在线编辑，实时同步数据"
          />
          <FeatureCard
            icon={<Calendar className="w-8 h-8" />}
            title="考勤记录"
            description="完整的考勤记录管理和查询功能"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="权限管理"
            description="灵活的权限控制，保障数据安全"
          />
        </div>
      </div>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <div className="text-blue-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
