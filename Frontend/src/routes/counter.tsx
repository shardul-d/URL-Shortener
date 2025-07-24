import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/counter')({
  component: RouteComponent,
})

function RouteComponent() {

  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  } 

  const decrement = () => {
     setCount(count => count - 2);
  }

  const increase100x = () => {
    setCount(count + 100);
  }
  return (
    <>
      <div>
        <h1 className="bg-amber-500">Count is: {count}</h1>
        <button onClick={increment} onDoubleClick={() => {
          decrement();
          increase100x();
        }}>Increment</button>
      </div>
    </>
  )
}
