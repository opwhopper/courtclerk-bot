import fetch from 'node-fetch';
import FormData from 'form-data';

export class Trello {
  constructor({ key, token, boardId, defaultListId }) {
    this.key = key;
    this.token = token;
    this.boardId = boardId;
    this.defaultListId = defaultListId;
    this.base = 'https://api.trello.com/1';
    if (!key || !token) console.warn('Trello key/token missing — Trello API calls will fail');
  }

    async getCard(cardIdOrUrl) {
    // Extract ID if it's a URL
    let cardId = cardIdOrUrl;
    if (cardIdOrUrl.includes('trello.com/c/')) {
      const parts = cardIdOrUrl.split('/');
      cardId = parts[parts.indexOf('c') + 1];
    }

    const url = `${this.base}/cards/${cardId}?key=${this.key}&token=${this.token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Trello API error: ${res.status}`);
    return res.json();
  }
  
  async getLabels() {
    const res = await fetch(`${this.base}/boards/${this.boardId}/labels?key=${this.key}&token=${this.token}`);
    if (!res.ok) throw new Error(`Trello API error: ${res.status}`);
    return res.json();
  }

  async findLabelByName(name) {
    const labels = await this.getLabels();
    return labels.find(l => l.name.toLowerCase() === name.toLowerCase());
  }

  async createCard({ name, desc, listId = this.defaultListId, labels = [] }) {
    const url = `${this.base}/cards`;
    const params = new URLSearchParams({
      key: this.key,
      token: this.token,
      idList: listId,
      name,
      desc
    });
    if (labels.length) params.append('idLabels', labels.join(','));
    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    return res.json();
  }

  async addAttachmentFromUrl(cardId, url, name) {
    const endpoint = `${this.base}/cards/${cardId}/attachments`;
    const params = new URLSearchParams({
      key: this.key,
      token: this.token,
      url,
      name
    });
    const res = await fetch(`${endpoint}?${params.toString()}`, { method: 'POST' });
    return res.json();
  }

  async addComment(cardId, text) {
    const endpoint = `${this.base}/cards/${cardId}/actions/comments`;
    const params = new URLSearchParams({
      key: this.key,
      token: this.token,
      text
    });
    const res = await fetch(`${endpoint}?${params.toString()}`, { method: 'POST' });
    return res.json();
  }
}
