/* ============================================================
   AKAL — scroll engine + interactions
   ============================================================ */
(function(){
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var clamp = function(v,a,b){ return Math.max(a, Math.min(b, v)); };
  var lerp = function(a,b,t){ return a+(b-a)*t; };

  /* ---------- Live city clocks ---------- */
  var CITIES = [
    { code:"LDN", name:"London",      tz:"Europe/London" },
    { code:"NYC", name:"New York",    tz:"America/New_York" },
    { code:"LAX", name:"Los Angeles", tz:"America/Los_Angeles" },
    { code:"MUM", name:"Mumbai",      tz:"Asia/Kolkata" },
    { code:"DXB", name:"Dubai",       tz:"Asia/Dubai" },
    { code:"BKK", name:"Bangkok",     tz:"Asia/Bangkok" }
  ];
  function timeFor(tz){
    try{
      return new Intl.DateTimeFormat("en-GB",{ timeZone:tz, hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).format(new Date());
    }catch(e){ return "--:--:--"; }
  }
  function timeShort(tz){ return timeFor(tz).slice(0,5); }

  /* build ticker (duplicated for seamless loop) */
  var track = document.getElementById("tickerTrack");
  if(track){
    var html = "";
    for(var pass=0; pass<2; pass++){
      for(var i=0;i<CITIES.length;i++){
        var c = CITIES[i];
        html += '<div class="ticker__item">'
              + '<span class="ticker__dot"></span>'
              + '<span class="ticker__city">'+c.name+'</span>'
              + '<span class="ticker__time" data-tz="'+c.tz+'">'+timeFor(c.tz)+'</span>'
              + '</div>';
      }
    }
    track.innerHTML = html;
  }

  function tick(){
    var els = document.querySelectorAll("[data-tz]");
    for(var i=0;i<els.length;i++){
      var tz = els[i].getAttribute("data-tz");
      els[i].textContent = els[i].classList.contains("led") ? timeShort(tz) : timeFor(tz);
    }
  }
  // map globe HUD leds to timezones
  (function(){
    var huds = [
      ["hud1","Europe/London"],["hud2","America/New_York"],["hud3","Asia/Kolkata"]
    ];
    huds.forEach(function(h){
      var el = document.getElementById(h[0]);
      if(el){ var led = el.querySelector(".led"); if(led){ led.setAttribute("data-tz", h[1]); led.textContent = timeShort(h[1]); } }
    });
  })();
  tick();
  setInterval(tick, 1000);

  /* ---------- Nav ---------- */
  var nav = document.getElementById("nav");
  var burger = document.getElementById("burger");
  if(burger){
    burger.addEventListener("click", function(){ nav.classList.toggle("open"); });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener("click", function(e){
      var id = a.getAttribute("href");
      if(id.length<2) return;
      var t = document.querySelector(id);
      if(t){
        e.preventDefault();
        nav.classList.remove("open");
        window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 10, behavior: reduce ? "auto":"smooth" });
      }
    });
  });

  /* ---------- Mail links: assembled at runtime so Cloudflare / scrapers
       can't rewrite them (defeats "Email Address Obfuscation"). ---------- */
  (function(){
    var EMAIL = "hello" + "@" + "akal" + "." + "global";
    document.querySelectorAll("[data-mail]").forEach(function(a){
      var subj = a.getAttribute("data-mail-subject");
      var href = "mailto:" + EMAIL + (subj ? "?subject=" + encodeURIComponent(subj) : "");
      a.setAttribute("href", href);
      var slot = a.querySelector(".mailtext");
      if(slot){ slot.textContent = EMAIL; }
      a.addEventListener("click", function(e){
        e.preventDefault();
        window.location.href = href;
      });
    });
  })();

  /* ---------- Reveal on scroll ---------- */
  var revs = document.querySelectorAll("[data-reveal]");
  if("IntersectionObserver" in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold:0.16, rootMargin:"0px 0px -8% 0px" });
    revs.forEach(function(el){ io.observe(el); });
  } else {
    revs.forEach(function(el){ el.classList.add("in"); });
  }

  /* ---------- Pillars expand ---------- */
  document.querySelectorAll(".pillar").forEach(function(p){
    p.addEventListener("click", function(){ p.classList.toggle("open"); });
  });
  /* ---------- Deal cards: display only (hover highlight, not clickable) ---------- */

  /* ---------- Scroll-driven engine (rAF) ---------- */
  var fill = document.getElementById("scrollFill");
  var heroScroll = document.getElementById("heroScroll");
  var heroVideo = document.getElementById("heroVideo");
  var heroInner = document.getElementById("heroInner");
  var heroDur = 0, lastVT = -1, primed = false;
  if(heroVideo){
    heroVideo.addEventListener("loadedmetadata", function(){ heroDur = heroVideo.duration || 0; });
    // decode frames once so scroll-scrubbing can seek anywhere, then hold paused
    var prime = function(){
      if(primed || !heroVideo) return;
      primed = true;
      var p = heroVideo.play();
      if(p && p.then){ p.then(function(){ heroVideo.pause(); }).catch(function(){ primed = false; }); }
      else { try{ heroVideo.pause(); }catch(e){} }
    };
    heroVideo.addEventListener("canplay", prime);
    ["pointerdown","touchstart","scroll","keydown","wheel"].forEach(function(ev){
      window.addEventListener(ev, prime, { once:true, passive:true });
    });
    heroVideo.load();
  }
  var globe = document.getElementById("globe");
  var globeImg = document.getElementById("globeImg");
  var globeCopy = document.getElementById("globeCopy");
  var hud1 = document.getElementById("hud1"), hud2 = document.getElementById("hud2"), hud3 = document.getElementById("hud3");
  var modelSec = document.getElementById("model");
  var modelBar = document.getElementById("modelBar");
  var bse = document.getElementById("bse");
  var bseSub = document.getElementById("bseSub");
  var bseSweep = document.querySelector(".bse__sweep");
  var reveal = document.getElementById("reveal");
  var rlines = document.querySelectorAll(".rline");

  var vh = window.innerHeight;
  window.addEventListener("resize", function(){ vh = window.innerHeight; });

  function sectionProgress(el){
    if(!el) return 0;
    var r = el.getBoundingClientRect();
    return clamp((-r.top) / (r.height - vh), 0, 1);
  }

  var ticking = false;
  function onScroll(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }
  function update(){
    ticking = false;
    var y = window.pageYOffset;
    var docH = document.documentElement.scrollHeight - vh;

    // progress rail
    if(fill) fill.style.width = (clamp(y/docH,0,1)*100).toFixed(2) + "%";

    // nav state
    if(nav){ nav.classList.toggle("scrolled", y > 40); }

    // HERO — video scrubs through as the user scrolls; content lifts & fades
    if(heroScroll){
      var hp = sectionProgress(heroScroll);
      if(heroVideo && heroDur){
        var t = hp * (heroDur - 0.05);
        if(isFinite(t) && Math.abs(t - lastVT) > 0.015){ try{ heroVideo.currentTime = t; lastVT = t; }catch(e){} }
      }
      if(heroInner){
        heroInner.style.opacity = clamp(1 - hp*1.35, 0, 1).toFixed(2);
        heroInner.style.transform = "translateY(" + (hp*-44).toFixed(1) + "px)";
      }
    }

    // GLOBE expand-to-fullscreen
    if(globe && globeImg){
      var gp = sectionProgress(globe);
      // scale small -> fills screen (and slightly beyond)
      var sc = lerp(0.42, 2.65, Math.pow(gp,1.08));
      globeImg.style.transform = "translate(-50%,-50%) scale("+sc.toFixed(3)+")";
      // copy: appears in the middle band, drifts up
      var copyOp = gp < 0.12 ? gp/0.12 : (gp > 0.7 ? clamp((0.92-gp)/0.22,0,1) : 1);
      if(globeCopy){
        globeCopy.style.opacity = copyOp.toFixed(2);
        globeCopy.style.transform = "translateY("+lerp(40,-40,gp)+"px)";
      }
      // HUD pins fade in once globe is large
      var hudOp = clamp((gp-0.32)/0.2,0,1) * clamp((0.85-gp)/0.15,0,1);
      [hud1,hud2,hud3].forEach(function(h,idx){
        if(!h) return;
        h.style.opacity = hudOp.toFixed(2);
        h.style.transform = "translateY("+lerp(14,0,clamp((gp-0.32)/0.2,0,1))+"px)";
      });
    }

    // MODEL progress bar
    if(modelSec && modelBar){
      var mr = modelSec.getBoundingClientRect();
      var mp = clamp((vh*0.85 - mr.top) / (mr.height*0.8), 0, 1);
      modelBar.style.width = lerp(8, 100, mp).toFixed(1) + "%";
    }

    // BUILD / SCALE / EXIT — blue light sweeps left→right driven by scroll
    if(bse){
      var bp = sectionProgress(bse);
      if(bseSweep){
        bseSweep.style.left = (bp*100).toFixed(2) + "%";
        // fade in at the start, fade out at the very end of the travel
        var sweepOp = clamp(bp/0.08,0,1) * clamp((1-bp)/0.08,0,1);
        bseSweep.style.opacity = sweepOp.toFixed(2);
      }
      if(bseSub) bseSub.style.opacity = clamp((bp-0.5)/0.22,0,1).toFixed(2);
    }

    // AKAL multilingual — sequential scroll-lit reveal
    if(reveal && rlines.length){
      var rp = sectionProgress(reveal);
      var rth = [0.06, 0.24, 0.40, 0.56, 0.74];
      for(var ri=0; ri<rlines.length; ri++){ rlines[ri].classList.toggle("lit", rp >= rth[ri]); }
    }
  }
  window.addEventListener("scroll", onScroll, { passive:true });
  window.addEventListener("resize", onScroll);
  update();

  // re-run reveal check for elements already in view on load
  setTimeout(function(){
    if(reduce) return;
    revs.forEach(function(el){
      var r = el.getBoundingClientRect();
      if(r.top < vh*0.9){ el.classList.add("in"); }
    });
  }, 60);
})();
