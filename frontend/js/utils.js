/**
 * AERO-TWIN — Utility Functions (Global)
 */
(function() {
  window.AeroUtils = {
    fmt: function(val, decimals, unit) {
      if (decimals === undefined) decimals = 1;
      if (unit === undefined) unit = '';
      if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return 'N/A';
      var formatted = typeof val === 'number' ? val.toFixed(decimals) : String(val);
      return unit ? formatted + ' ' + unit : formatted;
    },

    fmtInt: function(val) {
      if (val === null || val === undefined || isNaN(val)) return 'N/A';
      return Math.round(val).toLocaleString('en-US');
    },

    severityClass: function(severity) {
      if (!severity) return 'nominal';
      var s = String(severity).toUpperCase();
      if (s === 'CRITICAL') return 'critical';
      if (s === 'WARNING') return 'warning';
      if (s === 'CAUTION') return 'caution';
      if (s === 'ADVISORY') return 'advisory';
      return 'nominal';
    },

    healthStatus: function(val) {
      if (val === null || val === undefined) return { text: 'N/A', cls: 'secondary' };
      if (val >= 90) return { text: 'HEALTHY', cls: 'nominal' };
      if (val >= 75) return { text: 'DEGRADED', cls: 'caution' };
      if (val >= 50) return { text: 'WARNING', cls: 'warning' };
      return { text: 'CRITICAL', cls: 'critical' };
    },

    healthBarColor: function(val) {
      if (val === null || val === undefined) return 'var(--at-panel-border)';
      if (val >= 90) return 'var(--at-teal)';
      if (val >= 75) return 'var(--at-caution)';
      if (val >= 50) return 'var(--at-warning)';
      return 'var(--at-critical)';
    },

    fmtTime: function(ts) {
      if (!ts) return '--:--:--';
      try { return new Date(ts).toTimeString().split(' ')[0]; } catch(e) { return '--:--:--'; }
    },

    utcNow: function() {
      return 'UTC ' + new Date().toUTCString().split(' ')[4];
    }
  };
})();
