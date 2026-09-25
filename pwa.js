const status=document.querySelector('#pwa-status'),button=document.querySelector('#update-button');
if('serviceWorker' in navigator && location.protocol!=='file:'){
  let reloading=false,requested=false;const hadController=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if((hadController||requested)&&!reloading){reloading=true;location.reload();}});
  navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{
    const offer=()=>{if(!reg.waiting)return;button.hidden=false;button.onclick=()=>{requested=true;window.dispatchEvent(new Event('gamepause'));button.textContent='Обновление…';reg.waiting?.postMessage({type:'ACTIVATE'});};};
    offer();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(reg.waiting&&navigator.serviceWorker.controller)offer();else status.textContent='V7 · сохранено для офлайн-игры';}if(worker.state==='redundant')status.textContent='Офлайн-копия не сохранена. Открой игру с интернетом.';});});
    navigator.serviceWorker.ready.then(()=>{if(!reg.waiting)status.textContent='V7 · сохранено для офлайн-игры';});
    addEventListener('focus',()=>reg.update().catch(()=>{}));
    reg.update().catch(()=>{});
  }).catch(()=>{status.textContent='Не удалось сохранить PWA. Проверь интернет и HTTPS.';});
}else status.textContent='Для PWA открой игру через HTTPS.';
