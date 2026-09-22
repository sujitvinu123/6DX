/**
 * AERO-TWIN — Professional Chart Rendering Module (Global)
 * Multi-color gradients, proper aerospace-grade styling
 */
(function() {
  // Professional aerospace color palette
  var COLORS = {
    emerald:  '#10b981',
    teal:     '#007F86',
    cyan:     '#06b6d4',
    blue:     '#3b82f6',
    indigo:   '#6366f1',
    orange:   '#f97316',
    amber:    '#f59e0b',
    red:      '#ef4444',
    rose:     '#f43f5e',
    purple:   '#8b5cf6',
    gray:     '#94a3b8',
    grid:     '#e8ecef',
    axis:     '#64748B',
    bg:       '#FAFCFB'
  };

  // Channel-specific colors for professional look
  var CHANNEL_COLORS = {
    rpm:               { main: '#3b82f6', fill: 'rgba(59,130,246,0.08)',  grad1: '#3b82f6', grad2: '#60a5fa' },
    oil_pressure_bar:  { main: '#10b981', fill: 'rgba(16,185,129,0.08)', grad1: '#10b981', grad2: '#34d399' },
    oil_temp_c:        { main: '#f97316', fill: 'rgba(249,115,22,0.08)', grad1: '#f97316', grad2: '#fb923c' },
    cht_1_c:           { main: '#ef4444', fill: 'rgba(239,68,68,0.08)',  grad1: '#ef4444', grad2: '#f87171' },
    cht_2_c:           { main: '#f43f5e', fill: 'rgba(244,63,94,0.08)', grad1: '#f43f5e', grad2: '#fb7185' },
    cht_3_c:           { main: '#dc2626', fill: 'rgba(220,38,38,0.08)', grad1: '#dc2626', grad2: '#ef4444' },
    cht_4_c:           { main: '#b91c1c', fill: 'rgba(185,28,28,0.08)', grad1: '#b91c1c', grad2: '#dc2626' },
    egt_1_c:           { main: '#f59e0b', fill: 'rgba(245,158,11,0.08)', grad1: '#f59e0b', grad2: '#fbbf24' },
    egt_2_c:           { main: '#d97706', fill: 'rgba(217,119,6,0.08)', grad1: '#d97706', grad2: '#f59e0b' },
    egt_3_c:           { main: '#b45309', fill: 'rgba(180,83,9,0.08)',  grad1: '#b45309', grad2: '#d97706' },
    egt_4_c:           { main: '#92400e', fill: 'rgba(146,64,14,0.08)', grad1: '#92400e', grad2: '#b45309' },
    fuel_flow_lph:     { main: '#06b6d4', fill: 'rgba(6,182,212,0.08)',  grad1: '#06b6d4', grad2: '#22d3ee' },
    vibration_g:       { main: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', grad1: '#8b5cf6', grad2: '#a78bfa' },
    vib_rms_g:         { main: '#8b5cf6', fill: 'rgba(139,92,246,0.08)', grad1: '#8b5cf6', grad2: '#a78bfa' },
    vib_1x_g:          { main: '#7c3aed', fill: 'rgba(124,58,237,0.08)', grad1: '#7c3aed', grad2: '#8b5cf6' },
    vib_high_g:        { main: '#6d28d9', fill: 'rgba(109,40,217,0.08)', grad1: '#6d28d9', grad2: '#7c3aed' },
    coolant_temp_c:    { main: '#0891b2', fill: 'rgba(8,145,178,0.08)',  grad1: '#0891b2', grad2: '#06b6d4' },
    fuel_pressure_bar: { main: '#0d9488', fill: 'rgba(13,148,136,0.08)', grad1: '#0d9488', grad2: '#14b8a6' },
    altitude_m:        { main: '#6366f1', fill: 'rgba(99,102,241,0.08)', grad1: '#6366f1', grad2: '#818cf8' },
    throttle_pct:      { main: '#14b8a6', fill: 'rgba(20,184,166,0.08)', grad1: '#14b8a6', grad2: '#2dd4bf' },
    engine_load_pct:   { main: '#0ea5e9', fill: 'rgba(14,165,233,0.08)', grad1: '#0ea5e9', grad2: '#38bdf8' },
    battery_v:         { main: '#a855f7', fill: 'rgba(168,85,247,0.08)', grad1: '#a855f7', grad2: '#c084fc' },
    alternator_a:      { main: '#ec4899', fill: 'rgba(236,72,153,0.08)', grad1: '#ec4899', grad2: '#f472b6' }
  };

  var DEFAULT_CHANNEL = { main: '#007F86', fill: 'rgba(0,127,134,0.08)', grad1: '#007F86', grad2: '#38d9e6' };

  function getChannelColor(chKey) { return CHANNEL_COLORS[chKey] || DEFAULT_CHANNEL; }

  function prep(canvas) {
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var r = canvas.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    return ctx;
  }

  function empty(ctx, canvas, msg) {
    if (!ctx) return;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font = '11px IBM Plex Mono, monospace'; ctx.fillStyle = COLORS.gray;
    ctx.textAlign = 'center'; ctx.fillText(msg, canvas.width/2, canvas.height/2); ctx.textAlign = 'start';
  }

  function drawGrid(ctx, w, h, pad, minY, maxY, unit) {
    var plotH = h - pad.top - pad.bottom;
    ctx.font = '9px IBM Plex Mono, monospace'; ctx.fillStyle = COLORS.axis;
    for (var i = 0; i <= 5; i++) {
      var y = pad.top + (i/5)*plotH;
      var val = maxY - (i/5)*(maxY-minY);
      // Grid line with subtle dashing
      ctx.strokeStyle = i === 0 || i === 5 ? '#cbd5e1' : COLORS.grid;
      ctx.lineWidth = i === 0 || i === 5 ? 0.8 : 0.5;
      ctx.setLineDash(i === 0 || i === 5 ? [] : [2, 3]);
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(w-pad.right,y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'right'; ctx.fillText(val > 100 ? val.toFixed(0) : val > 10 ? val.toFixed(1) : val.toFixed(2), pad.left-6, y+3);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#94a3b8';
    ctx.fillText('NOW', w-pad.right, h-pad.bottom+16);
    ctx.fillText('-5m', pad.left + (w-pad.left-pad.right)*0.5, h-pad.bottom+16);
    ctx.textAlign = 'start';
  }

  function drawLine(ctx, vals, w, h, pad, minY, maxY, color, lw, dashed) {
    var plotW = w-pad.left-pad.right, plotH = h-pad.top-pad.bottom;
    var step = plotW / (vals.length-1||1);
    ctx.setLineDash(dashed ? [6,4] : []);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] === null || vals[i] === undefined) continue;
      var x = pad.left + i*step;
      var y = pad.top + (1 - (vals[i]-minY)/(maxY-minY)) * plotH;
      if (!started) { ctx.moveTo(x,y); started = true; } else ctx.lineTo(x,y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawGradientFill(ctx, vals, w, h, pad, minY, maxY, gradColor1, gradColor2) {
    var plotW = w-pad.left-pad.right, plotH = h-pad.top-pad.bottom;
    var step = plotW / (vals.length-1||1);
    var baseY = h-pad.bottom;
    ctx.beginPath(); var started = false; var lastX = pad.left;
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] === null || vals[i] === undefined) continue;
      var x = pad.left + i*step;
      var y = pad.top + (1 - (vals[i]-minY)/(maxY-minY))*plotH;
      if (!started) { ctx.moveTo(x,baseY); ctx.lineTo(x,y); started = true; } else ctx.lineTo(x,y);
      lastX = x;
    }
    ctx.lineTo(lastX, baseY); ctx.closePath();
    var grad = ctx.createLinearGradient(0, pad.top, 0, baseY);
    grad.addColorStop(0, hexToRgba(gradColor1, 0.18));
    grad.addColorStop(0.5, hexToRgba(gradColor2, 0.06));
    grad.addColorStop(1, hexToRgba(gradColor1, 0.01));
    ctx.fillStyle = grad; ctx.fill();
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    var r = parseInt(hex.substring(0,2), 16);
    var g = parseInt(hex.substring(2,4), 16);
    var b = parseInt(hex.substring(4,6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function autoRange(vals) {
    var valid = vals.filter(function(v) { return v !== null && v !== undefined; });
    if (valid.length === 0) return null;
    var min = Math.min.apply(null, valid), max = Math.max.apply(null, valid);
    var range = max - min || 1;
    return { min: min - range*0.12, max: max + range*0.12 };
  }

  // Draw end-point dot and current value
  function drawEndDot(ctx, vals, w, h, pad, minY, maxY, color) {
    var plotW = w-pad.left-pad.right, plotH = h-pad.top-pad.bottom;
    var step = plotW / (vals.length-1||1);
    var lastVal = null, lastIdx = -1;
    for (var i = vals.length-1; i >= 0; i--) {
      if (vals[i] !== null && vals[i] !== undefined) { lastVal = vals[i]; lastIdx = i; break; }
    }
    if (lastVal === null) return;
    var x = pad.left + lastIdx*step;
    var y = pad.top + (1 - (lastVal-minY)/(maxY-minY))*plotH;
    // Glow
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2);
    ctx.fillStyle = hexToRgba(color, 0.2); ctx.fill();
    // Dot
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI*2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    // Value label
    ctx.font = 'bold 10px IBM Plex Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(lastVal > 100 ? lastVal.toFixed(0) : lastVal.toFixed(2), x - 10, y - 8);
    ctx.textAlign = 'start';
  }

  window.AeroCharts = {
    drawTimeSeries: function(canvas, history, chKey, opts) {
      opts = opts || {};
      var ctx = prep(canvas);
      if (!ctx || history.length < 2) { empty(ctx, canvas, 'Awaiting data...'); return; }
      var w = canvas.width, h = canvas.height;
      var pad = {top:28, right:16, bottom:30, left:50};
      var vals = history.map(function(d) { return d.measured ? d.measured[chKey] : null; });
      var r = autoRange(vals);
      if (!r) { empty(ctx, canvas, 'No data for ' + chKey); return; }
      var cc = getChannelColor(chKey);
      ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,w,h);
      drawGrid(ctx, w, h, pad, r.min, r.max, '');
      drawGradientFill(ctx, vals, w, h, pad, r.min, r.max, cc.grad1, cc.grad2);
      drawLine(ctx, vals, w, h, pad, r.min, r.max, cc.main, 2.5, false);
      drawEndDot(ctx, vals, w, h, pad, r.min, r.max, cc.main);
      // Title
      ctx.font = 'bold 10px IBM Plex Mono, monospace'; ctx.fillStyle = '#1E293B';
      ctx.fillText(opts.title || chKey.toUpperCase(), pad.left, 14);
      // Channel color indicator
      ctx.fillStyle = cc.main; ctx.fillRect(pad.left - 14, 8, 8, 8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5;
    },

    drawMvP: function(canvas, history, chKey, opts) {
      opts = opts || {};
      var ctx = prep(canvas);
      if (!ctx || history.length < 2) { empty(ctx, canvas, 'Awaiting data...'); return; }
      var w = canvas.width, h = canvas.height;
      var pad = {top:28, right:16, bottom:30, left:50};
      var mVals = history.map(function(d) { return d.measured ? d.measured[chKey] : null; });
      var pVals = history.map(function(d) { return d.predicted ? d.predicted[chKey] : null; });
      var allVals = mVals.concat(pVals).filter(function(v) { return v !== null && v !== undefined; });
      if (allVals.length === 0) { empty(ctx, canvas, 'TWIN SYNCING'); return; }
      var min = Math.min.apply(null, allVals), max = Math.max.apply(null, allVals);
      var range = max - min || 1; min -= range*0.12; max += range*0.12;
      var cc = getChannelColor(chKey);
      ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,w,h);
      drawGrid(ctx, w, h, pad, min, max, '');
      // Measured fill
      drawGradientFill(ctx, mVals, w, h, pad, min, max, cc.grad1, cc.grad2);
      // Lines
      drawLine(ctx, mVals, w, h, pad, min, max, cc.main, 2.5, false);
      drawLine(ctx, pVals, w, h, pad, min, max, COLORS.orange, 2, true);
      drawEndDot(ctx, mVals, w, h, pad, min, max, cc.main);
      // Title
      ctx.font = 'bold 10px IBM Plex Mono, monospace'; ctx.fillStyle = '#1E293B';
      ctx.fillText(opts.title || chKey.toUpperCase(), pad.left, 14);
      // Legend
      var lx = w - 210;
      ctx.fillStyle = cc.main; ctx.fillRect(lx,5,12,3);
      ctx.font = '9px IBM Plex Mono, monospace'; ctx.fillStyle = '#1E293B'; ctx.fillText('MEASURED', lx+16, 11);
      ctx.setLineDash([4,3]); ctx.strokeStyle = COLORS.orange; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx+95,7); ctx.lineTo(lx+107,7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COLORS.orange; ctx.fillText('PREDICTED', lx+111, 11);
    },

    drawResidual: function(canvas, history, chKey, opts) {
      opts = opts || {};
      var ctx = prep(canvas);
      if (!ctx || history.length < 2) { empty(ctx, canvas, 'Awaiting residual data...'); return; }
      var w = canvas.width, h = canvas.height;
      var pad = {top:28, right:16, bottom:30, left:50};
      var vals = history.map(function(d) { return d.residuals ? d.residuals[chKey] : null; });
      var valid = vals.filter(function(v) { return v !== null && v !== undefined; });
      if (valid.length === 0) { empty(ctx, canvas, 'TWIN SYNCING'); return; }
      var absMax = Math.max(Math.abs(Math.min.apply(null,valid)), Math.abs(Math.max.apply(null,valid)), 0.01);
      var min = -absMax*1.2, max = absMax*1.2;
      ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,w,h);
      drawGrid(ctx, w, h, pad, min, max, '');
      // Zero line
      var zeroY = pad.top + (1 - (0-min)/(max-min))*(h-pad.top-pad.bottom);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pad.left,zeroY); ctx.lineTo(w-pad.right,zeroY); ctx.stroke();
      // Residual area shading (positive = red tint, negative = blue tint)
      var plotW = w-pad.left-pad.right, plotH = h-pad.top-pad.bottom;
      var step = plotW/(vals.length-1||1);
      for (var i = 0; i < vals.length; i++) {
        if (vals[i] === null || vals[i] === undefined) continue;
        var x = pad.left + i*step;
        var vy = pad.top + (1 - (vals[i]-min)/(max-min))*plotH;
        ctx.fillStyle = vals[i] > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)';
        ctx.fillRect(x-step*0.4, Math.min(vy,zeroY), step*0.8, Math.abs(vy-zeroY));
      }
      drawLine(ctx, vals, w, h, pad, min, max, COLORS.indigo, 2, false);
      drawEndDot(ctx, vals, w, h, pad, min, max, COLORS.indigo);
      ctx.font = 'bold 10px IBM Plex Mono, monospace'; ctx.fillStyle = '#1E293B';
      ctx.fillText('RESIDUAL: ' + (opts.title || chKey.toUpperCase()), pad.left, 14);
    },

    drawAnomaly: function(canvas, history) {
      var ctx = prep(canvas);
      if (!ctx || history.length < 2) { empty(ctx, canvas, 'Awaiting anomaly data...'); return; }
      var w = canvas.width, h = canvas.height;
      var pad = {top:28, right:16, bottom:30, left:50};
      var scores = history.map(function(d) { return d.anomaly ? d.anomaly.score : null; });
      var thresh = history.map(function(d) { return d.anomaly ? d.anomaly.threshold : null; });
      var all = scores.concat(thresh).filter(function(v) { return v !== null && v !== undefined; });
      if (all.length === 0) { empty(ctx, canvas, 'No anomaly data'); return; }
      var max = Math.max(1.0, Math.max.apply(null, all)) * 1.1;
      ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,w,h);
      drawGrid(ctx, w, h, pad, 0, max, '');
      // Danger zone above threshold
      var threshVal = thresh.find(function(v) { return v !== null; }) || 0.42;
      var threshY = pad.top + (1 - threshVal/max)*(h-pad.top-pad.bottom);
      ctx.fillStyle = 'rgba(239,68,68,0.04)';
      ctx.fillRect(pad.left, pad.top, w-pad.left-pad.right, threshY - pad.top);
      // Lines
      drawLine(ctx, thresh, w, h, pad, 0, max, COLORS.red, 1.5, true);
      drawGradientFill(ctx, scores, w, h, pad, 0, max, COLORS.emerald, COLORS.teal);
      drawLine(ctx, scores, w, h, pad, 0, max, COLORS.emerald, 2.5, false);
      drawEndDot(ctx, scores, w, h, pad, 0, max, COLORS.emerald);
      ctx.font = 'bold 10px IBM Plex Mono, monospace'; ctx.fillStyle = '#1E293B';
      ctx.fillText('ANOMALY SCORE vs THRESHOLD', pad.left, 14);
      // Legend
      var lx = w - 190;
      ctx.fillStyle = COLORS.emerald; ctx.fillRect(lx,5,12,3);
      ctx.font = '9px IBM Plex Mono, monospace'; ctx.fillStyle = '#1E293B'; ctx.fillText('SCORE', lx+16, 11);
      ctx.setLineDash([4,3]); ctx.strokeStyle = COLORS.red; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx+60,7); ctx.lineTo(lx+72,7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COLORS.red; ctx.fillText('THRESHOLD', lx+76, 11);
    },

    drawHealthBars: function(container, health) {
      if (!container) return;
      var bars = [
        {key:'thermal',label:'THERMAL (CHT / EGT)',color:'#ef4444'},
        {key:'mechanical',label:'MECHANICAL (CRANKSHAFT / PISTONS)',color:'#3b82f6'},
        {key:'lubrication',label:'LUBRICATION (OIL P / T)',color:'#f59e0b'},
        {key:'combustion',label:'COMBUSTION (FUEL / INJECTION)',color:'#10b981'},
        {key:'electrical',label:'ELECTRICAL (ALT / STARTER / ECU)',color:'#8b5cf6'}
      ];
      container.innerHTML = bars.map(function(b) {
        var val = health ? health[b.key] : null;
        var pct = (val !== null && val !== undefined) ? val : 0;
        var barColor = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : pct >= 50 ? '#f97316' : '#ef4444';
        var display = (val !== null && val !== undefined) ? Math.round(pct) + '%' : 'N/A';
        return '<div class="health-bar-row"><div class="health-bar-header"><span>' + b.label + '</span><span class="value" style="color:' + barColor + '">' + display + '</span></div><div class="health-bar-track"><div class="health-bar-fill" style="width:' + ((val!=null)?pct:0) + '%;background:linear-gradient(90deg,' + barColor + ',' + barColor + 'cc)"></div></div></div>';
      }).join('');
    },

    drawContributors: function(container, contributors) {
      if (!container || !contributors || !contributors.length) {
        if (container) container.innerHTML = '<div class="font-mono text-xs text-secondary" style="padding:8px">No contributor data</div>';
        return;
      }
      var barColors = [COLORS.red, COLORS.orange, COLORS.amber, COLORS.blue, COLORS.purple];
      container.innerHTML = contributors.map(function(c, idx) {
        var pct = Math.min(100, Math.max(0, c.pct || c.weight || 0));
        var col = barColors[idx % barColors.length];
        return '<div class="contributor-bar-row"><div class="contributor-bar-label">' + (c.channel||c.feature||'--') + '</div><div class="contributor-bar-track"><div class="contributor-bar-fill" style="width:' + pct + '%;background:' + col + '"></div></div><div class="contributor-bar-value">' + Math.round(pct) + '%</div></div>';
      }).join('');
    }
  };
})();
