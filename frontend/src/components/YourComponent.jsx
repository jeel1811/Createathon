// Incorrect way (might cause double calls)
useEffect(() => {
  fetchData();
}, [someValue]) // If someValue is changing unexpectedly

// Correct way
useEffect(() => {
  fetchData();
}, []) // Empty dependency array if you only want it to run once
