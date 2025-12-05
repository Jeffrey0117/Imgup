'use client';

interface RiskBadgeProps {
  riskScore: number;
  showDetails?: boolean;
  anomalies?: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskBadge({
  riskScore,
  showDetails = false,
  anomalies = [],
  className = '',
  size = 'md',
}: RiskBadgeProps) {
  const getRiskLevel = (score: number): { level: string; color: string; label: string } => {
    if (score <= 20) {
      return {
        level: 'low',
        color: 'bg-green-100 text-green-800 border-green-200',
        label: '低风险',
      };
    } else if (score <= 40) {
      return {
        level: 'moderate',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: '中低风险',
      };
    } else if (score <= 60) {
      return {
        level: 'medium',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: '中等风险',
      };
    } else if (score <= 80) {
      return {
        level: 'high',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: '高风险',
      };
    } else {
      return {
        level: 'critical',
        color: 'bg-red-100 text-red-800 border-red-200',
        label: '极高风险',
      };
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'moderate':
      case 'medium':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'high':
      case 'critical':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const risk = getRiskLevel(riskScore);

  if (!showDetails) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-full border ${risk.color} ${getSizeClasses()} ${className}`}
        title={`风险评分: ${riskScore}/100`}
      >
        {getRiskIcon(risk.level)}
        <span>{risk.label}</span>
        <span className="ml-1 opacity-75">({riskScore})</span>
      </span>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">风险评估</h3>
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full border ${risk.color} px-3 py-1 text-sm`}>
          {getRiskIcon(risk.level)}
          <span>{risk.label}</span>
        </span>
      </div>

      {/* Risk Score Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">风险评分</span>
          <span className="font-bold text-gray-900">{riskScore} / 100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              riskScore <= 20
                ? 'bg-green-500'
                : riskScore <= 40
                ? 'bg-blue-500'
                : riskScore <= 60
                ? 'bg-yellow-500'
                : riskScore <= 80
                ? 'bg-orange-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${riskScore}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>20</span>
          <span>40</span>
          <span>60</span>
          <span>80</span>
          <span>100</span>
        </div>
      </div>

      {/* Risk Factors */}
      {anomalies && anomalies.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">检测到的风险因素:</h4>
          <ul className="space-y-2">
            {anomalies.map((anomaly, idx) => (
              <li key={idx} className="flex items-start text-sm">
                <svg className="w-4 h-4 text-orange-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{anomaly}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Level Description */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          {risk.level === 'low' && (
            <span>该操作风险较低，可以正常进行。继续保持良好的使用习惯。</span>
          )}
          {(risk.level === 'moderate' || risk.level === 'medium') && (
            <span>该操作存在一定风险，建议谨慎处理。请确保符合使用规范。</span>
          )}
          {risk.level === 'high' && (
            <span>⚠️ 该操作风险较高，可能触发安全审核。请仔细检查您的操作。</span>
          )}
          {risk.level === 'critical' && (
            <span>🚨 该操作存在极高风险，可能被系统拒绝或限制。请立即停止可疑行为。</span>
          )}
        </p>
      </div>

      {/* Risk Score Breakdown */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase">风险评分标准</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-600">0-20: 低风险</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-600">21-40: 中低风险</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-gray-600">41-60: 中等风险</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span className="text-gray-600">61-80: 高风险</span>
          </div>
          <div className="flex items-center col-span-2">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
            <span className="text-gray-600">81-100: 极高风险</span>
          </div>
        </div>
      </div>
    </div>
  );
}
