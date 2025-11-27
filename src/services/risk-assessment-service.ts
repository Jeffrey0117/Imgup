export type RiskFactors = {
  usesVpnOrProxy?: boolean;
  highFrequencyUpload?: boolean;
  multiAccountSameIp?: boolean;
  abnormalTimeWindow?: boolean;
  historicalViolations?: boolean;
};

export type AnomalyDetail = {
  type: keyof RiskFactors;
  score: number;
  description: string;
};

export type RiskAssessmentResult = {
  score: number; // 0–100
  anomalies: AnomalyDetail[];
  report: string;
};

const FACTOR_SCORES: Record<keyof RiskFactors, number> = {
  usesVpnOrProxy: 30,
  highFrequencyUpload: 20,
  multiAccountSameIp: 25,
  abnormalTimeWindow: 15,
  historicalViolations: 10,
};

export class RiskAssessmentService {
  /**
   * 评估上传风险
   */
  assessUploadRisk(factors: RiskFactors): RiskAssessmentResult {
    const anomalies = this.detectAnomalies(factors);
    const score = Math.min(
      anomalies.reduce((sum, a) => sum + a.score, 0),
      100
    );
    const report = this.generateRiskReport(anomalies, score);
    return { score, anomalies, report };
  }

  /**
   * 异常检测
   */
  detectAnomalies(factors: RiskFactors): AnomalyDetail[] {
    return (Object.keys(FACTOR_SCORES) as (keyof RiskFactors)[])
      .filter((key) => Boolean(factors[key]))
      .map((key) => ({
        type: key,
        score: FACTOR_SCORES[key],
        description: this.describeAnomaly(key),
      }));
  }

  /**
   * 检查频率滥用
   */
  checkFrequencyAbuse(metrics: { uploadsPerHour: number; threshold: number }): boolean {
    return metrics.uploadsPerHour > metrics.threshold;
  }

  /**
   * 生成风险报告
   */
  generateRiskReport(anomalies: AnomalyDetail[], score: number): string {
    if (!anomalies.length) return 'No anomalies detected. Low risk.';

    const lines = anomalies.map(
      (a) => `- ${a.description} (+${a.score})`
    );
    lines.push(`\nTotal risk score: ${score}/100`);

    if (score >= 70) {
      lines.push('\n⚠️ HIGH RISK: Immediate review recommended');
    } else if (score >= 40) {
      lines.push('\n⚠️ MEDIUM RISK: Monitor closely');
    } else {
      lines.push('\n✅ LOW RISK: Normal activity');
    }

    return lines.join('\n');
  }

  /**
   * 描述异常类型
   */
  private describeAnomaly(type: keyof RiskFactors): string {
    switch (type) {
      case 'usesVpnOrProxy':
        return 'VPN/proxy usage detected';
      case 'highFrequencyUpload':
        return 'High-frequency uploads detected';
      case 'multiAccountSameIp':
        return 'Multiple accounts from the same IP';
      case 'abnormalTimeWindow':
        return 'Activity during abnormal time window';
      case 'historicalViolations':
        return 'Historical violations present';
      default:
        return 'Unknown anomaly';
    }
  }
}

export const riskAssessmentService = new RiskAssessmentService();
