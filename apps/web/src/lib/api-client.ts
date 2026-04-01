const API=process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export async function api<T>(path:string, init?:RequestInit):Promise<T>{const res=await fetch(`${API}${path}`,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})},credentials:'include'}); if(!res.ok) throw new Error('API error'); return res.json()}
