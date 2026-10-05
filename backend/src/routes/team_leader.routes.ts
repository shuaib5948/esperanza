import { Router } from 'express';
import { TeamLeaderController } from '../controllers/team_leader.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/rbac.middleware.js';

const router = Router();

// Protect all team leader routes: must be authenticated and have role TEAM_LEADER or ADMIN
router.use(authenticate, authorizeRoles('TEAM_LEADER', 'ADMIN'));

// Participant endpoints
router.get('/participants', TeamLeaderController.getParticipants);
router.get('/participants/:id', TeamLeaderController.getParticipantById);
router.get('/participants/:id/eligible-competitions', TeamLeaderController.getEligibleCompetitions);

// Entry endpoints
router.get('/competitions/:competitionId/entries', TeamLeaderController.getCompetitionEntries);
router.post('/competitions/:competitionId/entries', TeamLeaderController.createEntry);
router.get('/entries/:entryId', TeamLeaderController.getEntryById);
router.delete('/entries/:entryId', TeamLeaderController.deleteEntry);

// Entry participants
router.post('/entries/:entryId/participants', TeamLeaderController.addParticipant);
router.delete('/entries/:entryId/participants/:participantId', TeamLeaderController.removeParticipant);
router.patch('/entries/:entryId/participants/:participantId/attendance', TeamLeaderController.updateAttendance);

export default router;
