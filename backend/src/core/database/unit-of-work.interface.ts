export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Unit of Work interface abstracting transaction management (Clean Architecture).
 * The Application layer depends exclusively on this abstraction without leaking ORM details.
 */
export interface IUnitOfWork {
  /**
   * Executes an asynchronous callback within an atomic ACID database transaction.
   * All repository operations invoked within this callback automatically participate
   * in the transaction context and will roll back upon any unhandled exception.
   *
   * @param work Callback to execute within the transaction
   * @returns Result of the callback
   */
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
