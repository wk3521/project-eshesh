// Embeds a project's disciplines and tags through their join tables
export const PROJECT_LABELS_SELECT = 'project_discipline(disciplines(name)), project_tag(tags(name))'

export type ProjectLabels = {
  project_discipline: { disciplines: { name: string } | null }[] | null
  project_tag: { tags: { name: string } | null }[] | null
}

export function disciplineNames(project: ProjectLabels): string[] {
  return (project.project_discipline ?? []).flatMap((pd) => (pd.disciplines ? [pd.disciplines.name] : []))
}

export function tagNames(project: ProjectLabels): string[] {
  return (project.project_tag ?? []).flatMap((pt) => (pt.tags ? [pt.tags.name] : []))
}
