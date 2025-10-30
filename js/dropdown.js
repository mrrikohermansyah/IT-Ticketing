// Custom Dropdown Animation
document.addEventListener('DOMContentLoaded', function() {
  // Mengambil semua elemen select
  const selects = document.querySelectorAll('select');
  
  selects.forEach(select => {
    // Membuat wrapper untuk custom dropdown
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    
    // Membuat elemen untuk custom dropdown
    const customSelect = document.createElement('div');
    customSelect.className = 'custom-select';
    
    // Membuat elemen untuk selected option
    const selectedOption = document.createElement('div');
    selectedOption.className = 'custom-select-trigger';
    selectedOption.textContent = select.options[select.selectedIndex].textContent;
    
    // Membuat elemen untuk options
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-options';
    
    // Menambahkan options ke custom dropdown
    for (let i = 0; i < select.options.length; i++) {
      const optionItem = document.createElement('span');
      optionItem.className = 'custom-option';
      optionItem.setAttribute('data-value', select.options[i].value);
      optionItem.textContent = select.options[i].textContent;
      
      // Menandai option yang selected
      if (select.options[i].selected) {
        optionItem.classList.add('selection');
      }
      
      // Event listener untuk option
      optionItem.addEventListener('click', function() {
        // Update nilai select asli
        select.value = this.getAttribute('data-value');
        
        // Update text di trigger
        selectedOption.textContent = this.textContent;
        
        // Update class selection
        const siblings = this.parentNode.querySelectorAll('.custom-option');
        siblings.forEach(sibling => {
          sibling.classList.remove('selection');
        });
        this.classList.add('selection');
        
        // Tutup dropdown
        customSelect.classList.remove('opened');
        
        // Trigger event change pada select asli
        const event = new Event('change');
        select.dispatchEvent(event);
      });
      
      optionsList.appendChild(optionItem);
    }
    
    // Menambahkan elemen ke DOM
    customSelect.appendChild(selectedOption);
    customSelect.appendChild(optionsList);
    wrapper.appendChild(customSelect);
    
    // Sembunyikan select asli
    select.style.display = 'none';
    
    // Event listener untuk toggle dropdown
    selectedOption.addEventListener('click', function() {
      // Toggle class opened
      if (customSelect.classList.contains('opened')) {
        customSelect.classList.remove('opened');
      } else {
        // Tutup dropdown lain yang terbuka
        document.querySelectorAll('.custom-select.opened').forEach(select => {
          select.classList.remove('opened');
        });
        
        customSelect.classList.add('opened');
      }
    });
  });
  
  // Tutup dropdown saat klik di luar
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-select-wrapper')) {
      document.querySelectorAll('.custom-select.opened').forEach(select => {
        select.classList.remove('opened');
      });
    }
  });
});