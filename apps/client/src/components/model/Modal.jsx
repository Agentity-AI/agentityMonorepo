function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0f0f0f]/70 px-3 py-4 sm:px-6 sm:py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-base-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
