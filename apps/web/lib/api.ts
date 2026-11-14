export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(`${API}/api${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...options.headers},...options,cache:'no-store'});
 const value=await response.json().catch(()=>({}));if(!response.ok)throw Error(value.error||'Something went wrong');return value;
}
export type Me={id:string;alias:string;role:'USER'|'MODERATOR'|'ADMIN';createdAt:string;banned:boolean;mutedUntil:string|null};
export type Message={id:string;authorId:string;alias:string;body:string;createdAt:string};
