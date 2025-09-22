(() => {
  // 1. Get the specific iframe
  const iframe = document.querySelector('iframe[name="bb-base-admin-iframe"]');
  if (!iframe || !iframe.contentDocument) {
    alert("⚠ Go to Admin > Users to manage role privileges.");
    return;
  }

  const doc = iframe.contentDocument;

  // 2. Ensure we're on the correct managePrivileges page
  if (!doc.location.pathname.includes("/webapps/blackboard/execute/managePrivileges")) {
    alert("⚠ Go to the manage privileges of a course or system role.");
    return;
  }

  // 3. Function to show UIDs in the table
  const showUids = (context) => {
    const rows = context.querySelectorAll('tbody#listContainer_databody > tr');

    rows.forEach(row => {
      const checkbox = row.querySelector('input[type="checkbox"]');
      const th = row.querySelector('th');

      if (checkbox && th) {
        // Prevent duplicates
        if (!th.querySelector('.uid-display')) {
          const div = context.createElement('div');
          div.className = 'uid-display';
          div.innerHTML = `<i>${checkbox.value}</i>`;
          th.appendChild(div);
        }
      }
    });
  };

  // 4. Run the function inside the iframe document
  showUids(doc);
})();
