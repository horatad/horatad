param([string]$OutputPath = "C:\fingerprint\fp.png")

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -Path "C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPShrNET.dll"
Add-Type -Path "C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPDevNET.dll"
Add-Type -Path "C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPEngNET.dll"

Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Threading;
using System.Windows.Forms;
using DPFP;
using DPFP.Capture;

public class FPForm : Form, DPFP.Capture.EventHandler {
    private Capture capture;
    private string outputPath;
    private Label label;
    public bool Captured;
    public string ErrorMessage;

    public FPForm(string path) {
        outputPath = path;
        this.Text            = "Fingerprint Capture";
        this.FormBorderStyle = FormBorderStyle.FixedDialog;
        this.MaximizeBox     = false;
        this.MinimizeBox     = false;
        this.TopMost         = true;
        this.Size            = new Size(260, 100);
        this.StartPosition   = FormStartPosition.CenterScreen;

        label = new Label();
        label.Text      = "Place finger on scanner...";
        label.Dock      = DockStyle.Fill;
        label.TextAlign = ContentAlignment.MiddleCenter;
        label.Font      = new Font("Segoe UI", 12f);
        this.Controls.Add(label);

        this.Load += OnLoad;
    }

    private void OnLoad(object sender, EventArgs e) {
        try {
            Console.Error.WriteLine("DBG: new Capture()");
            capture = new Capture();
            Console.Error.WriteLine("DBG: set EventHandler");
            capture.EventHandler = this;
            Console.Error.WriteLine("DBG: StartCapture()");
            capture.StartCapture();
            Console.Error.WriteLine("DBG: waiting for finger...");
        } catch (Exception ex) {
            ErrorMessage = ex.GetType().Name + ": " + ex.Message;
            Console.Error.WriteLine("LOAD_ERR: " + ex.ToString());
            this.BeginInvoke(new Action(() => this.Close()));
        }
    }

    public void OnComplete(object c, string serial, DPFP.Sample sample) {
        Console.Error.WriteLine("DBG: OnComplete");
        try {
            if (sample != null) {
                var conv = new SampleConversion();
                Bitmap bmp = null;
                conv.ConvertToPicture(sample, ref bmp);
                if (bmp != null) {
                    bmp.Save(outputPath, ImageFormat.Png);
                    bmp.Dispose();
                    Captured = true;
                    Console.Error.WriteLine("DBG: saved " + outputPath);
                }
            }
        } catch (Exception ex) {
            ErrorMessage = ex.Message;
            Console.Error.WriteLine("COMPLETE_ERR: " + ex.ToString());
        }
        this.BeginInvoke(new Action(() => {
            try { if (capture != null) capture.StopCapture(); } catch {}
            try { if (capture != null) { capture.Dispose(); capture = null; } } catch {}
            Thread.Sleep(300);
            this.Close();
        }));
    }

    public void OnFingerTouch(object c, string s) {
        Console.Error.WriteLine("DBG: FingerTouch");
        this.BeginInvoke(new Action(() => { label.Text = "Hold still... (2-3 sec)"; }));
    }
    public void OnFingerGone(object c, string s) {
        Console.Error.WriteLine("DBG: FingerGone");
        this.BeginInvoke(new Action(() => { label.Text = "Place finger on scanner..."; }));
    }
    public void OnReaderConnect(object c, string s)    { Console.Error.WriteLine("DBG: ReaderConnect " + s); }
    public void OnReaderDisconnect(object c, string s) { Console.Error.WriteLine("DBG: ReaderDisconnect"); }
    public void OnSampleQuality(object c, string s, CaptureFeedback f) {
        Console.Error.WriteLine("DBG: Quality " + f);
        this.BeginInvoke(new Action(() => { label.Text = "Quality: " + f; }));
    }

    protected override void OnFormClosed(FormClosedEventArgs e) {
        if (capture != null) {
            try { capture.StopCapture(); } catch {}
            try { capture.Dispose(); capture = null; } catch {}
        }
        base.OnFormClosed(e);
    }
}
"@ -ReferencedAssemblies @(
    "C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPShrNET.dll",
    "C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPDevNET.dll",
    "C:\Program Files\DigitalPersona\One Touch SDK\.NET\Bin\DPFPEngNET.dll",
    "System.Drawing",
    "System.Windows.Forms"
)

$form = New-Object FPForm($OutputPath)
[System.Windows.Forms.Application]::Run($form)

if ($form.ErrorMessage) {
    Write-Output "ERROR: $($form.ErrorMessage)"
    exit 2
} elseif ($form.Captured) {
    Write-Output "OK: $OutputPath"
    exit 0
} else {
    Write-Output "FAILED"
    exit 1
}
