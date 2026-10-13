#target illustrator
/*
SCRIPTMETA-BEGIN
Script-ID: Illustrator-swatch-cmyk-namer
Version: 1.0.1
Meta-URL: https://github.com/SatoruTakahashi7/Illustrator-swatch-cmyk-namer
Target-App: Adobe Illustrator
Name: スウォッチ名をCMYK値にする
Author: GYAHTEI Design Laboratory / Satoru Takahashi
Description-BEGIN
通常のCMYKスウォッチとCMYKグローバルカラーを、実際の色定義から
C=0 M=0 Y=100 K=0形式の名前に変更します。
カラー値の丸めは変更しない／1刻み／5刻み／10刻みから選べます。
Description-END
SCRIPTMETA-END

【Credits】
    企画: GYAHTEI Design Laboratory / Satoru Takahashi
    実装支援: OpenAI Codex

【注意事項】
・「変更しない」では色の値を保持します。丸める場合はCMYK値を変更します。
・名前の数値は小数第2位まで表示し、浮動小数点の微小な誤差を整えます。
  名前は31文字以内。連番を付ける際に必要なら表示の小数桁数を減らします。
・グローバルカラーの丸めは、その元色を使用しているオブジェクトにも反映されます。
・通常スウォッチの丸めでは、すでに塗られた非グローバルのオブジェクトは変更しません。
・プロセス／特色、グローバル設定、濃度は変更しません。
・RGB、グレー、Lab、特色、レジストレーション、なし、パターン、
  グラデーションは対象外です。
・グローバルカラーはSpotColor.spot.colorからCMYKの元色を読みます。
  オブジェクトに適用された濃度ではなく、スウォッチの元色を命名します。
・同名になる場合は「 (2)」「 (3)」などを付けます。統合は行いません。
・実行前に保存し、最初は複製ドキュメントで結果を確認してください。

【免責事項】
・本スクリプトの使用は、利用者自身の責任で行ってください。
・本スクリプトの使用により生じたデータ損失、色の変化、文字化け、
  レイアウト崩れ、その他一切の損害について、制作者・提供者は責任を負いません。
*/
(function () {
    if (!app.documents.length) { alert("ドキュメントを開いてから実行してください。"); return; }
    var doc = app.activeDocument, entries = [], excluded = 0, readErrors = [], seenSpots = [], names = [];
    function readValues(color) {
        var values = [Number(color.cyan), Number(color.magenta), Number(color.yellow), Number(color.black)];
        for (var n = 0; n < 4; n++) {
            if (!isFinite(values[n]) || values[n] < 0 || values[n] > 100) throw new Error("CMYK値を正しく取得できません。");
        }
        return values;
    }
    function cmykName(values, digits) {
        if (digits === undefined) digits = 2;
        var keys = ["C", "M", "Y", "K"], parts = [];
        for (var n = 0; n < 4; n++) {
            var value = Number(values[n]);
            if (!isFinite(value) || value < 0 || value > 100) throw new Error("CMYK値を正しく取得できません。");
            value = Number(value.toFixed(digits));
            parts.push(keys[n] + "=" + String(value === 0 ? 0 : value));
        }
        return parts.join(" ");
    }
    for (var i = 0; i < doc.swatches.length; i++) {
        var swatch = doc.swatches[i];
        var safeName = "スウォッチ " + (i + 1);
        try {
            safeName = swatch.name; names[i] = safeName;
            var color = swatch.color, kind = "通常", spotName = "";
            if (color.typename === "SpotColor") {
                var spot = color.spot;
                if (spot.colorType !== ColorModel.PROCESS) { excluded++; continue; }
                color = spot.color;
                if (color.typename !== "CMYKColor") { excluded++; continue; }
                spotName = spot.name;
                var duplicate = false;
                for (var s = 0; s < seenSpots.length; s++) if (seenSpots[s] === spotName) duplicate = true;
                if (duplicate) { excluded++; continue; }
                seenSpots.push(spotName);
                kind = "グローバル";
            } else if (color.typename !== "CMYKColor") { excluded++; continue; }
            var values = readValues(color);
            entries.push({index:i, oldName:safeName, baseName:cmykName(values), values:values, kind:kind});
        } catch (e) { readErrors.push(safeName + "：" + String(e)); }
    }
    if (!entries.length) {
        alert("対象になるCMYKの通常色・グローバルカラーがありません。" + (readErrors.length ? "\n\n" + readErrors.join("\n") : ""));
        return;
    }
    var w = new Window("dialog", "スウォッチ名をCMYK値にする");
    w.orientation = "column"; w.alignChildren = "fill";
    w.add("statictext", undefined, "対象を選択してください（複数選択可）。");
    var list = w.add("listbox", undefined, [], {multiselect:true});
    list.preferredSize = [720, 300];
    for (i = 0; i < entries.length; i++) {
        list.add("item", "［" + entries[i].kind + "］ " + entries[i].oldName + " → " + entries[i].baseName);
        list.items[i].selected = true;
    }
    var selectionButtons = w.add("group");
    selectionButtons.add("button", undefined, "すべて選択").onClick = function () {
        for (var n = 0; n < list.items.length; n++) list.items[n].selected = true;
    };
    selectionButtons.add("button", undefined, "選択解除").onClick = function () {
        for (var n = 0; n < list.items.length; n++) list.items[n].selected = false;
    };
    var roundingRow = w.add("group"); roundingRow.add("statictext", undefined, "カラー値の丸め：");
    var rounding = roundingRow.add("dropdownlist", undefined, ["変更しない", "1刻み", "5刻み", "10刻み"]);
    rounding.selection = 0;
    w.add("statictext", undefined, "四捨五入。名前は小数第2位まで表示し、同名には連番を付けます。");
    w.add("statictext", undefined, "グローバルカラーは使用中の色も変わります。通常色はスウォッチだけ変わります。");
    w.add("statictext", undefined, "グローバルカラーは濃度100%の元色の値を使います。");
    var buttons = w.add("group"); buttons.alignment = "right";
    var run = buttons.add("button", undefined, "実行", {name:"ok"});
    buttons.add("button", undefined, "キャンセル", {name:"cancel"});
    run.onClick = function () {
        if (!list.selection || !list.selection.length) { alert("対象を選択してください。"); return; }
        w.close(1);
    };
    if (w.show() !== 1) return;
    var selected = list.selection, changed = 0, unchanged = 0, numbered = 0, errors = readErrors.slice(0);
    var step = [0, 1, 5, 10][rounding.selection.index];
    function occupied(name, ownIndex) {
        for (var n = 0; n < names.length; n++) if (n !== ownIndex && names[n] === name) return true;
        return false;
    }
    function freshValues(entry) {
        var c = doc.swatches.getByName(names[entry.index]).color;
        return readValues(entry.kind === "グローバル" ? c.spot.color : c);
    }
    function writeValues(entry, values) {
        var c = new CMYKColor();
        c.cyan = values[0]; c.magenta = values[1]; c.yellow = values[2]; c.black = values[3];
        if (entry.kind === "グローバル") doc.swatches.getByName(names[entry.index]).color.spot.color = c;
        else doc.swatches.getByName(names[entry.index]).color = c;
    }
    function writeName(entry, name) {
        // 名前変更でコレクションの並びと古い参照が変わるため、変更前後の名前で再取得する。
        var previous = names[entry.index];
        if (entry.kind === "グローバル") doc.swatches.getByName(previous).color.spot.name = name;
        else doc.swatches.getByName(previous).name = name;
        names[entry.index] = name;
        var actual = doc.swatches.getByName(name).name;
        if (actual !== name) throw new Error("スウォッチ名の確認失敗（現在：" + actual + "）");
        if (entry.kind === "グローバル" && doc.swatches.getByName(name).color.spot.name !== name) {
            throw new Error("グローバルカラーの元色名の確認失敗");
        }
    }
    for (i = 0; i < selected.length; i++) {
        var entry = entries[selected[i].index];
        var phase = "色取得", valueWritten = false, nameAttempted = false;
        var current = names[entry.index], before;
        try {
            before = freshValues(entry);
            var after = before.slice(0), valueChanged = false;
            if (step) for (var v = 0; v < 4; v++) {
                // 57.5が57.499998...として返る場合など、内部表現の誤差だけを補正する。
                after[v] = Math.max(0, Math.min(100, Math.round(after[v] / step + 0.000001) * step));
                if (Math.abs(after[v] - before[v]) > 0.00001) valueChanged = true;
            }
            if (valueChanged) {
                phase = "カラー値変更"; valueWritten = true; writeValues(entry, after);
            }
            // Illustratorが保持した実際の値から命名する。
            var actualValues = freshValues(entry), base = cmykName(actualValues), desired = base, suffix = 2;
            // 再実行時に、既存の連番名をさらに変更しない。
            var alreadyNamed = current === desired;
            for (var precision = 2; precision >= 0 && !alreadyNamed; precision--) {
                var candidate = cmykName(actualValues, precision);
                if (current.indexOf(candidate + " (") === 0 && /^\d+\)$/.test(current.substring(candidate.length + 2))) alreadyNamed = true;
            }
            if (alreadyNamed) {
                if (valueChanged) changed++; else unchanged++;
                continue;
            }
            while (occupied(desired, entry.index)) {
                var tail = " (" + suffix++ + ")", digits = 2;
                desired = cmykName(actualValues, digits) + tail;
                while (desired.length > 31 && digits > 0) desired = cmykName(actualValues, --digits) + tail;
                if (desired.length > 31) throw new Error("31文字以内の名前を作成できません。");
            }
            phase = "名前変更"; nameAttempted = true; writeName(entry, desired);
            names[entry.index] = desired;
            changed++;
            if (desired !== base) numbered++;
        } catch (err) {
            var rollback = [];
            if (nameAttempted) try { writeName(entry, current); } catch (r2) { rollback.push("名前復元失敗：" + String(r2)); }
            if (valueWritten && before) try { writeValues(entry, before); } catch (r1) { rollback.push("カラー値復元失敗：" + String(r1)); }
            try { names[entry.index] = doc.swatches.getByName(names[entry.index]).name; } catch (r3) { rollback.push("状態取得失敗：" + String(r3)); }
            errors.push(entry.oldName + " ［" + entry.kind + "／" + phase + "］：" + String(err) + (rollback.length ? "\n  " + rollback.join("\n  ") : "\n  変更を復元しました。"));
        }
    }
    app.redraw();
    var result = new Window("dialog", "スウォッチ名変更の結果");
    result.orientation = "column"; result.alignChildren = "fill";
    var message = "変更：" + changed + "色\n変更済み：" + unchanged + "色\n連番付き：" + numbered + "色\n対象外：" + excluded + "件\n取得／変更エラー：" + errors.length + "件";
    if (errors.length) message += "\n\n" + errors.join("\n");
    var report = result.add("edittext", undefined, message, {multiline:true, readonly:true, scrolling:true});
    report.preferredSize = [600, 240];
    result.add("button", undefined, "閉じる", {name:"ok"}); result.show();
}());
