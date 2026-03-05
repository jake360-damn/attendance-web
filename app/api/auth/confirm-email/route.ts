import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(request: Request) {
  try {
    // 检查环境变量
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      })
      return NextResponse.json({ 
        error: '服务器配置错误，请联系管理员设置 SUPABASE_SERVICE_ROLE_KEY 环境变量' 
      }, { status: 500 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: '请提供邮箱地址' }, { status: 400 })
    }

    // 使用 service role key 创建 admin 客户端
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 查找用户
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('List users error:', listError)
      return NextResponse.json({ error: '查找用户失败: ' + listError.message }, { status: 400 })
    }

    const user = users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在，请先注册' }, { status: 404 })
    }

    // 确认用户邮箱
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    )

    if (updateError) {
      console.error('Update user error:', updateError)
      return NextResponse.json({ error: '邮箱确认失败: ' + updateError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: '邮箱已确认，现在可以登录了',
      user: { id: user.id, email: user.email }
    })
  } catch (error: any) {
    console.error('Confirm email error:', error)
    return NextResponse.json({ error: error.message || '服务器错误' }, { status: 500 })
  }
}
