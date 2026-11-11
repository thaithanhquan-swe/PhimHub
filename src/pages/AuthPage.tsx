import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Đây là giao diện demo, chức năng tài khoản chưa được kết nối.");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(rgb(0_0_0/.7),rgb(0_0_0/.8)),url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=75')] bg-cover bg-center px-4 py-20">
      <section className="w-full max-w-[420px] rounded bg-black/85 px-7 py-10 sm:px-14 sm:py-12">
        <Link to="/" className="font-display text-2xl font-black text-primary">
          PhimHub
        </Link>
        <h1 className="mb-7 mt-8 text-3xl font-bold">
          {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
        </h1>
        <form onSubmit={submit} className="space-y-4">
          {isRegister && (
            <Input required autoComplete="name" placeholder="Tên của bạn" className="h-12 border-0 bg-[#333] px-4" />
          )}
          <Input required type="email" autoComplete="email" placeholder="Email hoặc số điện thoại" className="h-12 border-0 bg-[#333] px-4" />
          <Input required type="password" minLength={6} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Mật khẩu" className="h-12 border-0 bg-[#333] px-4" />
          <Button type="submit" className="mt-3 h-11 w-full font-bold">
            {isRegister ? "Đăng ký" : "Đăng nhập"}
          </Button>
        </form>
        {message && <p role="status" className="mt-4 text-sm text-white/70">{message}</p>}
        <p className="mt-7 text-sm text-white/60">
          {isRegister ? "Đã có tài khoản?" : "Bạn chưa có tài khoản?"}{" "}
          <button type="button" onClick={() => { setIsRegister(!isRegister); setMessage(""); }} className="font-semibold text-white hover:underline">
            {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
          </button>
        </p>
        <p className="mt-6 text-xs leading-5 text-white/40">
          Đây là trang demo giao diện. Thông tin nhập không được gửi hoặc lưu lại.
        </p>
      </section>
    </main>
  );
}
