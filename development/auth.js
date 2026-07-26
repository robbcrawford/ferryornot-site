// Shared sign-in for every /development page.
//
// WHAT THIS DOES AND DOES NOT PROTECT — worth being exact, because the intuition is
// usually wrong. These pages are static files on a CDN: anyone can request
// /development/schedule directly, and no dashboard "in front of" them changes that.
// What is actually protected is the DATA, by the edge functions that require a real
// signed-in user. This module exists so every page checks the same session and so the
// login UI lives in one file, not three.
//
// You sign in once. Supabase persists the session in localStorage per ORIGIN, so a
// session established at /development is already present at /development/schedule —
// same login, no second prompt, and each page still verifies rather than assuming.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://fhodvdsrlbahtxsgptky.supabase.co";
// Public by design: it identifies the project and nothing more. It is NOT what
// protects anything — the edge functions resolve the bearer token to a real user and
// refuse this key outright.
export const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZob2R2ZHNybGJhaHR4c2dwdGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNDk5NzQsImV4cCI6MjA5OTYyNTk3NH0.Bzq6oTWiHvmrXD2nioqv9eSPYTPI9pZyAWSjuByFrt4";
export const sb = createClient(SUPABASE_URL, ANON_KEY);

const GATE_HTML = `
<div id="devgate">
  <div class="card">
    <h1>FerryOrNot Development</h1>
    <p class="sub">Internal. Sign-in required.</p>
    <div data-step="password">
      <label for="dg-email">Email</label>
      <input id="dg-email" type="email" autocomplete="username">
      <label for="dg-pass">Password</label>
      <input id="dg-pass" type="password" autocomplete="current-password">
      <button id="dg-signin">Sign in</button>
    </div>
    <div data-step="totp" hidden>
      <p class="sub">Enter the 6-digit code from your authenticator.</p>
      <label for="dg-totp">Authentication code</label>
      <input id="dg-totp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6">
      <button id="dg-verify">Verify</button>
    </div>
    <div data-step="enroll" hidden>
      <p class="sub">Two-factor authentication is not set up yet.</p>
      <div data-sub="intro">
        <p class="sub"><strong>Delete any stale entry</strong> for this account from your
          authenticator first — an old secret can never produce an accepted code.
          Generating a QR replaces any previous one, so scan and verify in one sitting:
          <strong>reloading invalidates what you just scanned.</strong></p>
        <button id="dg-begin">Generate a QR code</button>
        <button id="dg-skip" class="ghost">Skip for now</button>
      </div>
      <div data-sub="live" hidden>
        <div class="qr"><img id="dg-qr" alt="TOTP QR code"></div>
        <p class="sub" id="dg-label"></p>
        <code class="secret" id="dg-secret"></code>
        <label for="dg-enrollcode">Code from the app</label>
        <input id="dg-enrollcode" type="text" inputmode="numeric" maxlength="6">
        <button id="dg-enroll">Turn on 2FA</button>
      </div>
    </div>
    <div class="err" id="dg-err"></div>
  </div>
</div>`;

// Resolves once a real session exists. Every page awaits this before rendering.
export function requireAuth(){
  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.innerHTML = GATE_HTML;
    const gate = host.firstElementChild;
    document.body.appendChild(gate);
    const $ = (id) => document.getElementById(id);
    const step = (name) => gate.querySelectorAll("[data-step]").forEach(
      (el) => el.hidden = el.dataset.step !== name);
    const err = (m) => $("dg-err").textContent = m || "";
    const done = () => { gate.remove(); resolve(); };

    async function check(){
      const { data:{ session } } = await sb.auth.getSession();
      if (!session){ gate.style.display=""; step("password"); return; }
      const { data:lvl } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (lvl?.nextLevel === "aal2" && lvl.currentLevel !== "aal2"){
        gate.style.display=""; step("totp"); return;
      }
      const { data:f } = await sb.auth.mfa.listFactors();
      if (!(f?.totp || []).some(x => x.status === "verified")){
        gate.style.display=""; step("enroll"); return;
      }
      done();
    }

    $("dg-signin").onclick = async () => {
      err(""); $("dg-signin").disabled = true;
      const { error } = await sb.auth.signInWithPassword({
        email: $("dg-email").value.trim(), password: $("dg-pass").value });
      $("dg-signin").disabled = false;
      if (error) return err(error.message);
      check();
    };
    $("dg-verify").onclick = async () => {
      err("");
      const { data:f } = await sb.auth.mfa.listFactors();
      const factor = (f?.totp || []).find(x => x.status === "verified");
      if (!factor) return err("No verified factor.");
      const ch = await sb.auth.mfa.challenge({ factorId: factor.id });
      if (ch.error) return err(ch.error.message);
      const v = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: ch.data.id,
                                           code: $("dg-totp").value.trim() });
      if (v.error) return err(v.error.message);
      check();
    };
    // Enrolment is explicit, never automatic on load: Supabase mints a NEW SECRET on
    // every enroll() call, so auto-generating one silently invalidates whatever the
    // user already scanned and no code can ever match.
    $("dg-begin").onclick = async () => {
      err(""); $("dg-begin").disabled = true;
      const { data:existing } = await sb.auth.mfa.listFactors();
      for (const x of (existing?.all || []).filter(y => y.status === "unverified")){
        await sb.auth.mfa.unenroll({ factorId: x.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({ factorType:"totp",
                                                         friendlyName:"FerryOrNot Dev" });
      $("dg-begin").disabled = false;
      if (error) return err(error.message);
      window.__factor = data.id;
      $("dg-qr").src = data.totp.qr_code;
      $("dg-secret").textContent = data.totp.secret;
      try {
        const u = new URL(data.totp.uri);
        $("dg-label").textContent = "Your app will list this as “" +
          decodeURIComponent(u.pathname.replace(/^\/+/,"")) + "”. Read the code from THAT entry.";
      } catch {}
      gate.querySelector('[data-sub="intro"]').hidden = true;
      gate.querySelector('[data-sub="live"]').hidden = false;
    };
    $("dg-enroll").onclick = async () => {
      err("");
      const ch = await sb.auth.mfa.challenge({ factorId: window.__factor });
      if (ch.error) return err(ch.error.message);
      const v = await sb.auth.mfa.verify({ factorId: window.__factor,
        challengeId: ch.data.id, code: $("dg-enrollcode").value.trim() });
      if (v.error) return err(v.error.message);
      check();
    };
    $("dg-skip").onclick = done;
    check();
  });
}

// Call an edge function with the caller's real user token.
export async function authedFetch(url){
  const { data:{ session } } = await sb.auth.getSession();
  if (!session) { location.reload(); throw new Error("signed out"); }
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + session.access_token, apikey: ANON_KEY }});
  if (res.status === 401){ location.reload(); throw new Error("signed out"); }
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

export async function signOut(){ await sb.auth.signOut(); location.reload(); }
