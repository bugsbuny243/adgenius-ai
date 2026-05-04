import 'server-only';

import { getSupabaseServiceRoleClient } from '@/lib/supabase-service-role';

type AuthContext = { userId: string; workspaceId: string; };

export async function refreshSingleBuildStatus(auth: AuthContext, jobId: string) { const serviceRole=getSupabaseServiceRoleClient(); const {data: job}=await serviceRole.from('unity_build_jobs').select('id,status').eq('id',jobId).eq('workspace_id',auth.workspaceId).maybeSingle(); if(!job) return {status:404, body:{ok:false,error:'Build işi bulunamadı.'}}; return {status:200, body:{ok:true,status:job.status,engine:'local-worker'}};}

export async function refreshProjectBuilds(auth: AuthContext, projectId: string){ const serviceRole=getSupabaseServiceRoleClient(); const {data: jobs,error}=await serviceRole.from('unity_build_jobs').select('id,status,artifact_url').eq('workspace_id',auth.workspaceId).eq('unity_game_project_id',projectId).order('created_at',{ascending:false}).limit(20); if(error) return {status:400, body:{ok:false,error:error.message}}; return {status:200, body:{ok:true, updated:0, repaired:0, results:(jobs??[]).map(j=>({jobId:j.id,status:j.status,artifactUrl:j.artifact_url})), errors:[]}};}
