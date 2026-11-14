"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { AddressSelector, MapPicker } from "@/features/checkout";
import { getApiHost } from "@/shared/lib/apiConfig";

export default function ProfilePage() {
  const { user, login, token, logout } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.push('/dang-nhap');
    }
  }, [mounted, token, router]);
  
  const initialAddr = user?.addresses?.find((a: any) => a.isDefault) || user?.addresses?.[0];
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    gender: user?.gender || "male",
    dob: user?.dob ? user.dob.split('T')[0] : "1990-01-01",
    address: initialAddr?.streetAddress || "",
    position: initialAddr?.latitude ? { 
      lat: Number(initialAddr.latitude), 
      lng: Number(initialAddr.longitude) 
    } : null
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch full profile when page loads
  useEffect(() => {
    const fetchProfile = async () => {
      let activeToken = token;
      if (!activeToken && typeof window !== 'undefined') {
        try {
          const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          activeToken = authStorage?.state?.token;
        } catch (e) {}
      }
      if (!activeToken) return;
      try {
        const res = await fetch(`${getApiHost(3012)}/auth/me`, {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const fetchedUser = await res.json();
          // Cập nhật lại store
          login(fetchedUser, activeToken);
          
          const defaultAddr = fetchedUser.addresses?.find((a: any) => a.isDefault) || fetchedUser.addresses?.[0];
          setFormData({
            name: fetchedUser.name || "",
            phone: fetchedUser.phone || "",
            gender: fetchedUser.gender || "male",
            dob: fetchedUser.dob ? fetchedUser.dob.split('T')[0] : "1990-01-01",
            address: defaultAddr?.streetAddress || "",
            position: defaultAddr?.latitude ? { 
              lat: Number(defaultAddr.latitude), 
              lng: Number(defaultAddr.longitude) 
            } : null
          });
        }
      } catch (err) {
        console.warn("Lỗi khi tải profile:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [token, login]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let activeToken = token;
      if (!activeToken && typeof window !== 'undefined') {
        try {
          const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          activeToken = authStorage?.state?.token;
        } catch (e) {}
      }

      const res = await fetch(`${getApiHost(3012)}/users/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          name: formData.name,
          gender: formData.gender,
          dob: formData.dob,
          addressStr: formData.address,
          lat: formData.position?.lat,
          lng: formData.position?.lng
        })
      });

      if (res.status === 401) {
        logout();
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!");
        router.push("/dang-nhap");
        return;
      }

      if (!res.ok) throw new Error("Cập nhật thất bại");

      const updatedUser = await res.json();

      login({
        ...user,
        ...updatedUser,
        name: updatedUser.name || formData.name,
        gender: updatedUser.gender || formData.gender,
        dob: updatedUser.dob || formData.dob,
        addresses: updatedUser.addresses || [
          {
            streetAddress: formData.address,
            latitude: formData.position?.lat,
            longitude: formData.position?.lng,
            isDefault: true,
          }
        ]
      }, token || "");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi lưu hồ sơ!");
    } finally {
      setIsLoading(false);
    }
  };

  const setIsLoading = setIsSaving;

  return (
    <div>
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Hồ sơ của tôi</h1>
        <p className="text-gray-500 text-sm">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
      </div>

      {isLoadingProfile ? (
        <div className="text-center py-8">Đang tải thông tin...</div>
      ) : (
      <div className="max-w-2xl">
        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center justify-between">
            <span className="font-medium">Cập nhật hồ sơ thành công! Dữ liệu đã được lưu vào Database.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-600 font-medium md:text-right">Họ và tên</label>
            <div className="md:col-span-2">
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" 
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-600 font-medium md:text-right">Số điện thoại</label>
            <div className="md:col-span-2">
              <input 
                type="text" 
                value={formData.phone} 
                disabled 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-600 font-medium md:text-right">Giới tính</label>
            <div className="md:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="gender" 
                  value="male" 
                  checked={formData.gender === "male"}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span>Nam</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="gender" 
                  value="female" 
                  checked={formData.gender === "female"}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span>Nữ</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-600 font-medium md:text-right">Ngày sinh</label>
            <div className="md:col-span-2">
              <input 
                type="date" 
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-4 border-t border-gray-100 mt-6">
            <label className="text-gray-600 font-medium md:text-right mt-3">Địa chỉ giao hàng</label>
            <div className="md:col-span-2 space-y-4">
              {formData.address && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100 text-sm">
                  <strong>Địa chỉ đang lưu:</strong> {formData.address}
                </div>
              )}
              <div className="text-sm text-gray-500 italic mt-2 mb-1">
                * Nếu bạn muốn thay đổi địa chỉ, hãy chọn lại ở bên dưới:
              </div>
              <AddressSelector onAddressChange={(addr) => setFormData({...formData, address: addr})} />
              <div className="text-sm text-gray-500 italic mt-2">
                * Bạn có thể click vào Bản đồ dưới đây để ghim chính xác tọa độ giao hàng (Tùy chọn)
              </div>
              <MapPicker 
                position={formData.position} 
                setPosition={(pos) => setFormData({...formData, position: pos})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="md:col-start-2 md:col-span-2">
              <button 
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white font-medium py-3 px-8 rounded-xl transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
              </button>
            </div>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
