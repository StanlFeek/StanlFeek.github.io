(function () {
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (error) {}
    }

    const input = document.createElement('textarea')
    input.value = text
    input.setAttribute('readonly', '')
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch (error) {}
    input.remove()
    return ok
  }

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const copied = await copyText(button.getAttribute('data-copy') || '')
      button.classList.toggle('is-copied', copied)
      if (copied) {
        window.setTimeout(function () { button.classList.remove('is-copied') }, 1400)
      }
    })
  })
})()
