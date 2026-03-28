$gem = Get-Content GEMINI.md -Raw
$start = $gem.IndexOf('## 📁 Project Structure')
$endMarker = "---`r`n`r`n## 🎨 UI: Design System (mandatory)"
$end = $gem.IndexOf($endMarker)
if ($start -lt 0 -or $end -lt 0) { throw 'Markers not found' }
$before = $gem.Substring(0, $start)
$after = $gem.Substring($end)
$paths = Get-Content scripts/project_structure_filesystem.txt
$section = "## 📁 Project Structure`r`n`r`n> Snapshot actualizado del filesystem (excluye `.git`, `node_modules`, `dist`, `logs`).`r`n`r`n```text`r`n" + ($paths -join "`r`n") + "`r`n```" + "`r`n`r`n"
$updated = $before + $section + $after
Set-Content GEMINI.md -Value $updated -Encoding UTF8
Write-Output 'UPDATED_OK'
