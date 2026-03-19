import { useLanguage } from '../context'

export function ExplorePage() {
  const { t } = useLanguage()

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      <div className="text-center">
        <h2 className="text-xl font-medium mb-2 text-foreground">{t('explore.title')}</h2>
        <p>{t('explore.subtitle')}</p>
      </div>
    </div>
  );
}
