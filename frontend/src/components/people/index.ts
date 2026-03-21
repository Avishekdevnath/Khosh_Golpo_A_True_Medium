// People feature barrel — re-export all public components

export { default as PeopleWorkspaceShell }   from "./PeopleWorkspaceShell";
export { default as PeopleCard }             from "./PeopleCard";
export { default as UserCard }               from "./UserCard";
export { default as PeopleExploreWorkspace } from "./PeopleExploreWorkspace";
export { default as PeopleSearchWorkspace }  from "./PeopleSearchWorkspace";
export { default as PeopleRequestsWorkspace } from "./PeopleRequestsWorkspace";

// Sub-components (exported for potential standalone use / testing)
export { default as ExploreSectionBlock }    from "./ExploreSectionBlock";
export { default as SearchStatePanel }       from "./SearchStatePanel";
export { default as RequestCard }            from "./RequestCard";
