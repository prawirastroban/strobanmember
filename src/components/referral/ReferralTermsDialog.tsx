import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText } from "lucide-react";

const DEFAULT_TERMS = `Syarat & Ketentuan Program Referral

1. Program referral hanya untuk akun yang terverifikasi.
2. Poin diberikan setelah referee mendaftar & melakukan transaksi lunas.
3. Poin dapat ditukar menjadi voucher diskon servis atau dicairkan menjadi tunai sesuai minimum yang berlaku.
4. Setiap penyalahgunaan (akun fiktif, manipulasi, spam) akan menggugurkan poin & memblokir akun.
5. Pihak Bengkel Mobil Stroban Service berhak mengubah ketentuan sewaktu-waktu untuk menjaga kepercayaan kedua belah pihak.
6. Dengan menyetujui, Anda dan perusahaan sepakat menjalankan program ini secara jujur & transparan.`;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  termsText?: string | null;
  termsVersion: number;
  readOnly?: boolean;
  submitting?: boolean;
  onAccept?: () => void;
  onCancel?: () => void;
}

const ReferralTermsDialog = ({ open, onOpenChange, termsText, termsVersion, readOnly, submitting, onAccept, onCancel }: Props) => {
  const [agreed, setAgreed] = useState(false);
  const text = (termsText && termsText.trim().length > 0) ? termsText : DEFAULT_TERMS;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setAgreed(false); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Syarat & Ketentuan Referral
          </DialogTitle>
          <DialogDescription>Versi v{termsVersion} — wajib disetujui untuk menggunakan fitur referral.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] rounded-md border bg-muted/30 p-4">
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{text}</div>
        </ScrollArea>

        {!readOnly && (
          <label className="flex items-start gap-2 text-sm cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-4 w-4 mt-0.5"
            />
            <span>Saya membaca & menyetujui Syarat & Ketentuan Program Referral di atas.</span>
          </label>
        )}

        <DialogFooter>
          {readOnly ? (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel} disabled={submitting}>Batal</Button>
              <Button onClick={onAccept} disabled={!agreed || submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Setuju & Lanjutkan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReferralTermsDialog;