function PageHeader({ title, description, actions, className = "" }) {
  return (
    <section
      className={[
        "mb-7 flex flex-col gap-4",
        "sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      ].join(" ")}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="w-full shrink-0 sm:w-auto">{actions}</div>}
    </section>
  );
}

export default PageHeader;
