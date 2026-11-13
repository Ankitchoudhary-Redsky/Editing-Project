import { SaveTemplateDialog } from './SaveTemplateDialog'
import { TemplateGallery } from './TemplateGallery'
import { useTemplateFeature } from './TemplateFeatureContext'

export function TemplateExperience() {
  const { saveDialogOpen } = useTemplateFeature()
  return <><TemplateGallery />{saveDialogOpen && <SaveTemplateDialog />}</>
}