"use strict";

const STORAGE_KEY = "maktab-ovozi-demo-v1";
const defaultProposals = [
  { id: "break", title: "Katta tanaffusni 30 daqiqaga uzaytirish", description: "Tanaffusda shoshilmasdan ovqatlanish, dam olish va keyingi darsga tayyorlanish uchun ko‘proq vaqt.", category: "Dars jadvali", days: 5, votes: 0, voters: 0, icon: "◷" },
  { id: "water", title: "Bepul issiq suv dispenserlari", description: "Maktabning qulay joylariga choy va qahva uchun issiq suv dispenserlarini o‘rnatish.", category: "Qulayliklar", days: 8, votes: 0, voters: 0, icon: "♨" },
  { id: "start", title: "Darslarni 8:30 da boshlash", description: "Ertalabki shoshilishni kamaytirib, o‘quvchilarga maktabga o‘z vaqtida yetib kelish imkonini berish.", category: "Dars jadvali", days: 12, votes: 0, voters: 0, icon: "☼" },
  { id: "uniform", title: "Maktab formasiga talablarni yumshatish", description: "Xavfsizlik va ozodalikka rioya qilgan holda kiyinish uslubida biroz erkinlik berish.", category: "Maktab qoidalari", days: 18, votes: 0, voters: 0, icon: "✦" }
];
const seed = { proposals: defaultProposals, voter: { name: "", id: "" }, voted: {}, implemented: 0 };
let state = loadState();
let currentFilter = "all";
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.proposals)) return structuredCopy(seed);
    const restored = { ...structuredCopy(seed), ...saved, proposals: saved.proposals };
    for (const proposal of restored.proposals) {
      const recordedVotes = Object.keys(restored.voted || {}).filter(key => key.endsWith(`:${proposal.id}`)).length;
      proposal.votes = recordedVotes;
      proposal.voters = recordedVotes;
    }
    restored.implemented = 0;
    return restored;
  } catch (error) {
    console.error("Demo ma’lumotlarini yuklab bo‘lmadi:", error);
    return structuredCopy(seed);
  }
}
function structuredCopy(value) { return JSON.parse(JSON.stringify(value)); }
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { console.error("Demo ma’lumotlarini saqlab bo‘lmadi:", error); showToast("Ma’lumotlarni saqlab bo‘lmadi. Brauzer xotirasini tekshiring."); }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}
function votedKey(proposalId) { return `${state.voter.id || "guest"}:${proposalId}`; }
function hasVoted(proposalId) { return Boolean(state.voted[votedKey(proposalId)]); }
function totalVotes(proposal) { return Number(proposal.votes) || 0; }
function daysLabel(days) { return Number(days) <= 0 ? "Yakunlangan" : `${days} kun qoldi`; }
function tagClass(category) {
  if (category === "Dars jadvali") return "orange-tag";
  if (category === "Qulayliklar") return "green-tag";
  if (category === "Maktab qoidalari") return "blue-tag";
  return "";
}
function percent(proposal) {
  if (totalVotes(proposal) === 0) return 0;
  const maxVotes = Math.max(1, ...state.proposals.map(totalVotes));
  return Math.max(10, Math.round(totalVotes(proposal) / maxVotes * 100));
}
function uniqueVoterCount() {
  return new Set(Object.keys(state.voted).map(key => key.slice(0, key.lastIndexOf(":")))).size;
}
function renderCard(proposal) {
  const alreadyVoted = hasVoted(proposal.id);
  const count = totalVotes(proposal);
  return `<article class="proposal-card">
    <div class="card-topline"><span class="category-tag ${tagClass(proposal.category)}">${escapeHtml(proposal.category)}</span><span class="deadline">${daysLabel(proposal.days)}</span></div>
    <h3>${escapeHtml(proposal.title)}</h3><p>${escapeHtml(proposal.description)}</p>
    <div class="vote-progress"><div class="progress-label"><span>Ovozlar</span><strong>${count} ta</strong></div><div class="progress-track"><div class="progress-fill" style="width:${percent(proposal)}%"></div></div></div>
    <div class="card-bottom"><div class="voter-stack"><span class="voter-bubble">M</span><span class="voter-bubble">D</span><span class="voter-bubble">A</span><span class="voter-bubble">+</span><span class="voter-count">${count} o‘quvchi</span></div><button class="vote-button ${alreadyVoted ? "voted" : ""}" data-vote="${escapeHtml(proposal.id)}">${alreadyVoted ? "✓ Ovoz berdingiz" : "Ovoz berish →"}</button></div>
  </article>`;
}
function renderHome() {
  document.getElementById("home-proposals").innerHTML = state.proposals.slice(0, 4).map(renderCard).join("");
  const activeCount = state.proposals.filter(proposal => proposal.days > 0).length;
  document.getElementById("stat-proposals").textContent = String(activeCount).padStart(2, "0");
  document.getElementById("nav-open-count").textContent = activeCount;
  document.getElementById("stat-voters").textContent = String(uniqueVoterCount());
  document.getElementById("stat-implemented").textContent = String(state.implemented || 0);
}
function renderProposals() {
  const query = document.getElementById("proposal-search").value.trim().toLocaleLowerCase("uz");
  const filtered = state.proposals.filter(proposal => {
    const statusMatch = currentFilter === "all" || (currentFilter === "open" ? proposal.days > 0 : proposal.days <= 0);
    return statusMatch && `${proposal.title} ${proposal.description} ${proposal.category}`.toLocaleLowerCase("uz").includes(query);
  });
  document.getElementById("all-proposals").innerHTML = filtered.map(renderCard).join("");
  document.getElementById("empty-proposals").classList.toggle("hidden", filtered.length > 0);
  document.getElementById("filter-count-all").textContent = state.proposals.length;
  document.getElementById("filter-count-open").textContent = state.proposals.filter(proposal => proposal.days > 0).length;
}
function renderResults() {
  const total = state.proposals.reduce((sum, proposal) => sum + totalVotes(proposal), 0);
  document.getElementById("results-voter-count").textContent = String(uniqueVoterCount());
  document.getElementById("results-active-count").textContent = String(state.proposals.filter(proposal => proposal.days > 0).length).padStart(2, "0");
  document.getElementById("results-list").innerHTML = state.proposals.map(proposal => {
    const count = totalVotes(proposal);
    const share = total ? Math.round(count / total * 100) : 0;
    return `<article class="result-card"><div class="result-title"><span class="result-icon">${escapeHtml(proposal.icon || "✳")}</span><div><h3>${escapeHtml(proposal.title)}</h3><small>${escapeHtml(proposal.category)} · ${count} ta ovoz</small></div></div><div class="result-meter"><div class="progress-label"><span>Qo‘llab-quvvatlash</span><strong>${share}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${share}%"></div></div></div><div class="result-status"><strong>${proposal.days > 0 ? "Ovoz berish ochiq" : "Yakunlangan"}</strong><small>${daysLabel(proposal.days)}</small></div></article>`;
  }).join("");
}
function renderAdmin() {
  document.getElementById("admin-proposal-list").innerHTML = state.proposals.map(proposal => `<div class="admin-row"><span class="category-tag ${tagClass(proposal.category)}">${escapeHtml(proposal.category)}</span><div><strong>${escapeHtml(proposal.title)}</strong><small>${totalVotes(proposal)} ta ovoz · ${daysLabel(proposal.days)}</small></div><button class="delete-proposal" data-delete="${escapeHtml(proposal.id)}" aria-label="Taklifni o‘chirish">×</button></div>`).join("");
}
function render() {
  const name = state.voter.name || "Mehmon";
  document.getElementById("profile-name").textContent = name;
  document.getElementById("top-name").textContent = name;
  document.getElementById("profile-avatar").textContent = name === "Mehmon" ? "O‘" : name.slice(0, 1).toLocaleUpperCase("uz");
  document.getElementById("home-proposals").innerHTML = state.proposals.slice(0, 4).map(renderCard).join("");
  renderHome();
  renderProposals();
  renderResults();
  renderAdmin();
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function navigate(page) {
  const title = { home: "Bosh sahifa", proposals: "Takliflar", results: "Natijalar", admin: "Admin paneli" };
  document.querySelectorAll(".page").forEach(element => element.classList.toggle("active-page", element.id === `page-${page}`));
  document.querySelectorAll(".nav-item").forEach(element => element.classList.toggle("active", element.dataset.page === page));
  document.getElementById("breadcrumb-current").textContent = title[page] || "Bosh sahifa";
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function vote(proposalId) {
  if (!state.voter.name) {
    document.getElementById("profile-dialog").showModal();
    showToast("Ovoz berishdan oldin ismingizni kiriting.");
    return;
  }
  const proposal = state.proposals.find(item => item.id === proposalId);
  if (!proposal || proposal.days <= 0) return showToast("Bu so‘rovnoma uchun ovoz berish yopilgan.");
  if (hasVoted(proposalId)) return showToast("Bu taklifga allaqachon ovoz bergansiz.");
  state.voted[votedKey(proposalId)] = true;
  proposal.votes = totalVotes(proposal) + 1;
  proposal.voters = proposal.votes;
  saveState();
  render();
  showToast("Ovozingiz qabul qilindi. Rahmat!");
}
document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) navigate(pageButton.dataset.page);
  const voteButton = event.target.closest("[data-vote]");
  if (voteButton) vote(voteButton.dataset.vote);
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    const proposal = state.proposals.find(item => item.id === deleteButton.dataset.delete);
    if (proposal && window.confirm(`“${proposal.title}” taklifini demo ro‘yxatidan o‘chirasizmi?`)) {
      state.proposals = state.proposals.filter(item => item.id !== proposal.id);
      saveState(); render(); showToast("Taklif demo ro‘yxatidan o‘chirildi.");
    }
  }
});
document.querySelectorAll(".filter-tab").forEach(button => button.addEventListener("click", () => {
  currentFilter = button.dataset.filter;
  document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.toggle("selected", tab === button));
  renderProposals();
}));
document.getElementById("proposal-search").addEventListener("input", renderProposals);
document.getElementById("proposal-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  if (!title || !description) return showToast("Taklif nomi va tavsifini to‘ldiring.");
  state.proposals.unshift({ id: `proposal-${Date.now()}`, title, description, category: String(form.get("category")), days: Number(form.get("days")), votes: 0, voters: 0, icon: "✳" });
  saveState(); event.currentTarget.reset(); render(); showToast("Yangi taklif e’lon qilindi."); navigate("proposals");
});
function openProfileDialog() {
  document.getElementById("voter-name").value = state.voter.name;
  document.getElementById("voter-id").value = state.voter.id;
  document.getElementById("profile-dialog").showModal();
}
document.getElementById("profile-button").addEventListener("click", openProfileDialog);
document.getElementById("top-profile").addEventListener("click", openProfileDialog);
document.querySelector(".dialog-close").addEventListener("click", () => document.getElementById("profile-dialog").close());
document.getElementById("profile-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("voter-name").value.trim();
  if (!name) return showToast("Iltimos, ismingizni kiriting.");
  const newId = document.getElementById("voter-id").value.trim();
  if (newId && state.voter.id && newId !== state.voter.id && Object.keys(state.voted).length) {
    showToast("Demo rejimida IDni ovoz bergandan keyin almashtirib bo‘lmaydi.");
    return;
  }
  state.voter = { name, id: newId || state.voter.id || `guest-${Date.now()}` };
  saveState(); event.currentTarget.closest("dialog").close(); render(); showToast(`Xush kelibsiz, ${name}!`);
});
document.getElementById("mobile-menu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
render();