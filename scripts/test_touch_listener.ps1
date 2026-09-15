Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Yoga Book 9i Touch Diagnostic Test"
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(0, 0)
$form.Size = New-Object System.Drawing.Size(1440, 1800)
$form.TopMost = $true
$form.Opacity = 0.75
$form.BackColor = [System.Drawing.Color]::Black

$label = New-Object System.Windows.Forms.Label
$label.Text = "TOUCH DIAGNOSTIC`n`nTap anywhere on the TOP SCREEN, then on the BOTTOM SCREEN.`nPress ESC to close."
$label.ForeColor = [System.Drawing.Color]::White
$label.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$label.AutoSize = $false
$label.Size = New-Object System.Drawing.Size(1400, 200)
$label.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($label)

$logBox = New-Object System.Windows.Forms.ListBox
$logBox.Location = New-Object System.Drawing.Point(20, 230)
$logBox.Size = New-Object System.Drawing.Size(1400, 600)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 12)
$form.Controls.Add($logBox)

$logFile = "$PSScriptRoot\touch_events.log"
"Touch Log Started at $(Get-Date)" | Out-File $logFile

$form.Add_MouseDown({
    param($sender, $e)
    $msg = "[$(Get-Date -Format 'HH:mm:ss.fff')] Click/Touch at X=$($e.X), Y=$($e.Y) Button=$($e.Button)"
    $logBox.Items.Insert(0, $msg)
    $msg | Out-File $logFile -Append
})

$form.Add_KeyDown({
    param($sender, $e)
    if ($e.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $form.Close()
    }
})

$form.ShowDialog()
