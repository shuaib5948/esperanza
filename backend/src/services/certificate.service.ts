import { CertificateRepository } from '../repositories/certificate.repository.js';
import { CompetitionRepository } from '../repositories/competition.repository.js';

export class CertificateService {
  static async verifyByCode(verificationCode: string) {
    const cert = await CertificateRepository.findByVerificationCode(verificationCode);
    if (!cert) {
      throw {
        statusCode: 404,
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'No certificate exists with the provided verification code.',
      };
    }
    return {
      certificate_number: cert.certificate_number,
      verification_code: cert.verification_code,
      status: cert.status,
      issued_at: cert.issued_at,
      position: cert.position,
      participant: {
        name: cert.participant_name,
        code: cert.participant_code,
        team: cert.team_name,
      },
      competition: {
        programme_number: cert.programme_number,
        name: cert.competition_name,
        group: cert.group_name,
      },
      festival: 'Esperanza 2026–27',
      is_valid: cert.status === 'ISSUED',
    };
  }

  static async getById(id: number) {
    const cert = await CertificateRepository.findById(id);
    if (!cert) {
      throw {
        statusCode: 404,
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      };
    }
    return cert;
  }

  static async list(filters: { participant_id?: number; competition_id?: number; status?: string }) {
    return CertificateRepository.findAll(filters);
  }

  static async generate(competitionId: number) {
    const comp = await CompetitionRepository.findById(competitionId);
    if (!comp) {
      throw {
        statusCode: 404,
        code: 'COMPETITION_NOT_FOUND',
        message: 'Competition not found',
      };
    }

    const certs = await CertificateRepository.generateCertificatesForPublishedResults(competitionId);
    if (certs.length === 0) {
      throw {
        statusCode: 400,
        code: 'NO_PUBLISHED_RESULTS',
        message: 'Cannot generate certificates because no published results exist for this competition.',
      };
    }
    return certs;
  }

  static async revoke(id: number) {
    const cert = await CertificateRepository.findById(id);
    if (!cert) {
      throw {
        statusCode: 404,
        code: 'CERTIFICATE_NOT_FOUND',
        message: 'Certificate not found',
      };
    }
    return CertificateRepository.revoke(id);
  }
}
