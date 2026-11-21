/* ==========================================================================
 * ModelHub cron —— 定时探活（[task_local]）
 * 把每个已启用模型的延迟/成败写进 $prefs，供网关零网络秒选。
 * ========================================================================== */

function MH_CRON() {
  function done() { try { $done(); } catch (e) { } }

  var st = MH.load();
  var mode = st.cfg.checkMode || 'ping';

  var list = [];
  for (var i = 0; i < st.models.length; i++) {
    var m = st.models[i];
    if (!m.enabled) continue;
    if (!MH.pOf(st, m.pid)) continue;
    list.push({ id: m.id, pid: m.pid, name: m.name });
  }

  if (!list.length) {
    MH.log(st, '[cron] 没有已启用的模型，跳过');
    MH.save(st);
    return done();
  }

  var results = {};
  var idx = 0, running = 0, doneN = 0;
  var LIMIT = 4;
  var before = MH.stats(st);

  function finish() {
    var s2 = MH.load();
    for (var j = 0; j < s2.models.length; j++) {
      var mm = s2.models[j];
      var r = results[mm.id];
      if (!r) continue;
      MH.applyProbe(s2, mm, r.err, r.lat);
    }
    var after = MH.stats(s2);
    MH.log(s2, '[cron] ' + list.length + ' 个模型探活完成，' + after.healthy + ' 可用');

    // 全部挂掉才通知，避免打扰
    if (after.healthy === 0 && before.healthy > 0) {
      try { $notify('ModelHub', '所有模型都不可用', '请打开面板检查 Key 或网络'); } catch (e) { }
    }
    MH.save(s2);
    done();
  }

  function next() {
    if (doneN >= list.length) return finish();
    if (running >= LIMIT || idx >= list.length) return;
    var task = list[idx++];
    running++;
    (function (task) {
      var p = MH.pOf(st, task.pid);
      if (!p) { results[task.id] = { err: '提供商已删除', lat: 0 }; running--; doneN++; return next(); }
      MH.probe(p, task.name, mode, function (err, lat) {
        results[task.id] = { err: err || '', lat: lat || 0 };
        running--; doneN++;
        next();
      });
    })(task);
    next();
  }

  next();
}
