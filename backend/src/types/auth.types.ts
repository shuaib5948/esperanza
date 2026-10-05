import { Request } from 'express';

export type UserRole = 'ADMIN' | 'TEAM_LEADER' | 'PARTICIPANT' | 'JUDGE';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserPayload {
  id: number;
  uuid: string;
  name: string;
  email: string | null;
  role: UserRole;
  teamId?: number | null;
  participantId?: number | null;
  judgeId?: number | null;
}

export interface AuthenticatedRequest<P = any, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: UserPayload;
}
