// Inject a single navbar + footer across pages and handle active link highlighting
document.addEventListener('DOMContentLoaded', function(){
  try{
    const navHtml = `
      <nav class="navbar" role="navigation" aria-label="Main navigation">
        <div class="container nav-inner">
          <div class="nav-logo">
            <a href="./index.html"><img src="./assets/logo.svg" alt="Logo"></a>
            <a href="./index.html" class="nav-home" style="text-decoration:none;color:inherit;font-weight:800">SN Security</a>
          </div>
          <div class="nav-links" role="menubar">
            <a href="./index.html" data-page="index">Home</a>
            <a href="./courses.html" data-page="courses">Courses</a>
            <a href="./tech-store.html" data-page="tech-store">Tech Store</a>
            <a href="./tools.html" data-page="tools">Tools</a>
            <a href="./roadmap.html" data-page="roadmap">Roadmap</a>
            <a href="./osint.html" data-page="osint">OSINT</a>
            <a href="./ctf-news.html" data-page="ctf-news">CTF & News</a>
            <a href="./about.html" data-page="about">About</a>
            <a href="./contact.html" data-page="contact">Contact</a>
            <a href="./legal.html" data-page="legal">Legal</a>
          </div>
        </div>
      </nav>
    `;

    const footerHtml = `
      <footer class="site-footer">
        <div class="container footer-inner">
          <p>© 2026 SN Security. All rights reserved.</p>
          <p class="muted">Designed for ethical hacking education.</p>
        </div>
      </footer>
    `;

    const navPlaceholder = document.getElementById('site-navbar');
    if(navPlaceholder) navPlaceholder.innerHTML = navHtml;
    const footPlaceholder = document.getElementById('site-footer');
    if(footPlaceholder) footPlaceholder.innerHTML = footerHtml;

    // Active link based on filename
    const path = (location.pathname || '').split('/').pop() || 'index.html';
    const name = path.replace('.html','');
    document.querySelectorAll('.nav-links a').forEach(a=>{
      try{
        const pg = a.getAttribute('data-page');
        if(pg===name || (name==='index' && pg==='index')){
          a.classList.add('active');
          a.setAttribute('aria-current','page');
        }
      }catch(e){/* ignore */}
    });

  }catch(e){console.error('Layout injection failed',e)}
});
