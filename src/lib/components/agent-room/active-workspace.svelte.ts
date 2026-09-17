/**
 * Workspace ativo no Canvas/Workbench, para o DesktopTitlebar (fora da arvore
 * da rota) saber a quem o sino e o compartilhamento se referem, e como abrir
 * o dialogo de compartilhamento que continua vivendo na propria pagina.
 */

let currentId = $state<string | null>(null);
let openSharing: (() => void) | null = null;

export const activeWorkspaceStore = {
  get id() {
    return currentId;
  },
};

export function setActiveWorkspaceId(id: string | null) {
  currentId = id;
}

export function setSharingOpenHandler(handler: (() => void) | null) {
  openSharing = handler;
}

export function requestOpenSharing() {
  openSharing?.();
}
