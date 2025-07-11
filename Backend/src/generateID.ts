import { nanoid } from 'nanoid';

function generateID(): string {
  let id: string;

  do {
    id = nanoid(7);
  } while (id in database);
  
  return id;
}

export default generateID;