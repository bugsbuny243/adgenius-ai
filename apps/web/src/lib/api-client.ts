const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
async function req(path:string,init:RequestInit={}){const res=await fetch(`${BASE_URL}${path}`,{...init,credentials:'include',headers:{'Content-Type':'application/json',...(init.headers||{})}});if(res.status===401&&typeof window!=='undefined')window.location.href='/login';if(!res.ok)throw new Error(await res.text());if(res.status===204)return null;return res.json()}
export const authApi={login:(b:any)=>req('/api/v1/auth/login',{method:'POST',body:JSON.stringify(b)}),signup:(b:any)=>req('/api/v1/auth/signup',{method:'POST',body:JSON.stringify(b)}),me:()=>req('/api/v1/auth/me')}
export const brandsApi={list:()=>req('/api/v1/brands')}
export const productsApi={list:()=>req('/api/v1/products')}
export const audiencesApi={list:()=>req('/api/v1/audiences')}
export const campaignsApi={list:()=>req('/api/v1/adnet/campaigns')}
export const publishersApi={profile:()=>req('/api/v1/publishers/profile')}
export const adnetApi={wallet:()=>req('/api/v1/advertiser/wallet'),deposit:(amount:number)=>req('/api/v1/advertiser/wallet/deposit',{method:'POST',body:JSON.stringify({amount})})}
export const aiReportsApi={campaign:(body:any)=>req('/api/v1/ai/reports/campaign',{method:'POST',body:JSON.stringify(body)})}
export const payoutApi={list:()=>req('/api/v1/publisher/payouts')}
