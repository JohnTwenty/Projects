export class BoardStateAdapter {
    constructor(api, state) {
        this.api = api;
        this.state = state;
    }
    getState() {
        return this.state;
    }
    newBoard(size, segLibText, tokenLibText) {
        this.state = this.api.newBoard(size, segLibText, tokenLibText);
        return this.state;
    }
    addSegment(seg) {
        this.api.addSegment(this.state, seg);
    }
    removeSegment(id) {
        this.api.removeSegment(this.state, id);
    }
    addToken(tok) {
        this.api.addToken(this.state, tok);
    }
    removeToken(id) {
        this.api.removeToken(this.state, id);
    }
    importBoardText(text) {
        this.api.importBoardText(this.state, text);
    }
    exportBoardText(missionName = 'Untitled') {
        return this.api.exportBoardText(this.state, missionName);
    }
    getCellType(coord) {
        return this.api.getCellType(this.state, coord);
    }
}
