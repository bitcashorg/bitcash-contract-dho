cmake_minimum_required( VERSION 3.5 )

project(bitcash.dho)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

if(${BUILD_TESTS})
    add_definitions(-DDEBUG)
endif()

add_contract(  bitcashdho bitcash.dho
               bitcash.dho.cpp
               bitcash.dho.utils.cpp
               proposal/factory.cpp
)

target_include_directories(bitcash.dho
   PUBLIC
   ${CMAKE_CURRENT_SOURCE_DIR}
)

set_target_properties(bitcash.dho
   PROPERTIES
   RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}")

configure_file( ${CMAKE_CURRENT_SOURCE_DIR}/ricardian/bitcash.dho.contracts.md.in ${CMAKE_CURRENT_BINARY_DIR}/ricardian/bitcash.dho.contracts.md @ONLY )

target_compile_options( bitcash.dho PUBLIC -R${CMAKE_CURRENT_SOURCE_DIR}/ricardian -R${CMAKE_CURRENT_BINARY_DIR}/ricardian )
