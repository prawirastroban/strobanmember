import UpdateCenter from "@/pages/UpdateCenter";

const UpdateCenterPreview = () => (
  <div className="rounded-2xl border border-white/10 bg-muted/10 overflow-hidden">
    <div className="px-4 py-2 text-xs text-muted-foreground border-b border-white/10 bg-muted/20">
      Preview tampilan untuk user (/update-center)
    </div>
    <div className="max-h-[70vh] overflow-y-auto">
      <UpdateCenter />
    </div>
  </div>
);

export default UpdateCenterPreview;